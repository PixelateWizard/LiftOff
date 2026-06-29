# Xbox Game Pass Silent Install Spike Findings

Date: 2026-06-29  
Source spike: `C:\Users\taylo\Downloads\spike-xbox-silent-install.md`  
Scope: research only; no production LiftOff source was changed.

## Summary

The proposed Display Catalog -> SFS -> download packages -> `PackageManager.AddPackageAsync` path is not ready to spec as-is.

The important finding is that current winget has two separate Store paths:

- `winget install` for MS Store products uses `Windows.ApplicationModel.Store.Preview.InstallControl.AppInstallManager` by product ID, with no-toast silent options and progress polling.
- `winget download` uses Display Catalog plus SFS to resolve `.appx` / `.msix` package files, downloads them, and fetches a license file.

LiftOff's existing Xbox PKCE Microsoft access token did not authenticate to the Display Catalog package endpoint. Unauthenticated catalog access returned `403`; the Xbox-scope bearer token returned `401`. Attempts to mint a BigCatalog audience token from the existing `/consumers` refresh token failed because BigCatalog is configured for Azure AD users only.

Recommended pivot: prototype the Store InstallControl path first for silent Game Pass installation/progress. Keep the Display Catalog/SFS/AddPackage route as a later offline-package investigation only if LiftOff can solve BigCatalog/licensing/package-management restrictions.

## Winget Source Review

Reviewed upstream `microsoft/winget-cli` at commit `1781ce7b98e9b65f137a09db6fc5e1ec785cf73b`.

The source paths in the spike have moved:

- Current Display Catalog / SFS wrapper: `src/AppInstallerCommonCore/MSStoreDownload.cpp`
- Public download structs/context: `src/AppInstallerCommonCore/Public/winget/MSStoreDownload.h`
- MS Store install/update/repair workflow: `src/AppInstallerCLICore/Workflows/MSStoreInstallerHandler.cpp`
- Store install implementation: `src/AppInstallerCommonCore/MSStore.cpp`
- Install command orchestration: `src/AppInstallerCLICore/Commands/InstallCommand.cpp`

### Display Catalog URL

Confirmed in `MSStoreDownload.cpp`:

```text
GET https://displaycatalog.mp.microsoft.com/v7.0/products/{productId}
  ?fieldsTemplate=Details
  &market={OS region}
  &languages={requested/user locales},Neutral
  &catalogIds=4
Authorization: Bearer {token}
```

Winget looks for:

- `Product.DisplaySkuAvailabilities[]`
- target `Sku.SkuId == "0015"`
- `Sku.Properties.Packages[]`
- package fields: `PackageId`, `Architectures`, `Languages`, `PackageFormat`, `ContentId`, `FulfillmentData.WuCategoryId`

Package formats accepted by winget's parser are `AppxBundle`, `MsixBundle`, `Appx`, and `Msix`.

### Display Catalog Auth

Winget creates a Microsoft Entra ID auth request for resource:

```text
https://bigcatalog.commerce.microsoft.com
```

It passes the result as the standard `Authorization: Bearer ...` header.

This is not the same audience as LiftOff's current Xbox PKCE token, which is minted with:

```text
XboxLive.signin offline_access
```

### SFS Call Shape

Current winget no longer exposes a hand-written `SFSClientImpl.cpp` in the repo. It initializes the SFS client with:

```text
accountId = storeapps
instanceId = storeapps
```

Then it calls:

```text
GetLatestAppDownloadInfo(productRequests = { { WuCategoryId, {} } })
```

No Display Catalog bearer token is passed into this visible SFS wrapper call. The low-level HTTP URL was not confirmed from current winget source because it lives inside the external SFS client dependency, not in this checkout.

The returned SFS app files are normalized into:

- direct package URL
- base64 SHA-256 hash decoded to bytes
- package full-name-derived version
- generated download filename

Winget filters to supported file extensions and keeps the newest version per platform/architecture pair. It separates main packages from dependency packages.

## Live Catalog API Probe

Test product ID:

```text
9NBLGGH43KZB
```

Requested URL:

```text
https://displaycatalog.mp.microsoft.com/v7.0/products/9NBLGGH43KZB?fieldsTemplate=Details&market=US&languages=en-US,Neutral&catalogIds=4
```

Results:

| Probe | Result |
| --- | --- |
| No auth | `403 Forbidden` |
| `Authorization: Bearer {LiftOff Xbox-scope MS access token}` | `401 Unauthorized` |
| Refresh existing LiftOff token for `https://bigcatalog.commerce.microsoft.com/.default` | token mint failed |
| Refresh existing LiftOff token for `https://bigcatalog.commerce.microsoft.com/user_impersonation` | token mint failed |
| v1-style `resource=https://bigcatalog.commerce.microsoft.com` against `/consumers` | token mint failed |

Sanitized token error for the BigCatalog attempts:

```text
AADSTS9002332: Application 'cd891c19-e90c-4265-ac3f-f909ef0177de' (BigCatalog) is configured for use by Azure Active Directory users only. Please do not use the /consumers endpoint to serve this request.
```

Conclusion: LiftOff's existing MSA/Xbox PKCE token is not sufficient for the winget Display Catalog package endpoint.

## Live SFS Probe

Not performed.

Reason: Step 2 did not return a `WuCategoryId`, and the current winget source only calls SFS after Display Catalog returns a preferred package with `FulfillmentData.WuCategoryId`.

The expected direct SFS endpoint from the proposal remains unverified against current winget source:

```text
https://storeapps.api.cdp.microsoft.com/api/v2/contents/storeapps/namespaces/default/names/{WuCategoryId}/versions/latest/files?action=GenerateDownloadInf
```

## `PackageManager.AddPackageAsync` Feasibility

Current LiftOff `src-tauri/Cargo.toml` already depends on `windows = 0.61.3`, but it does not enable the WinRT deployment feature.

Needed feature gate:

```toml
"Management_Deployment"
```

The local generated `windows-rs` bindings include:

```rust
windows::Management::Deployment::PackageManager
windows::Management::Deployment::DeploymentOptions
windows::Management::Deployment::DeploymentProgress
PackageManager::AddPackageAsync(...)
```

Binding shape:

```rust
PackageManager::AddPackageAsync(
    package_uri,
    dependency_package_uris,
    deployment_options,
) -> Result<IAsyncOperationWithProgress<DeploymentResult, DeploymentProgress>>
```

Feasibility verdict:

- Callable from Rust after enabling `Management_Deployment`.
- Should be wrapped in `spawn_blocking` or otherwise kept off the async UI path, because callers will wait on a WinRT async operation and forward progress events.
- Needs local `file://` URIs for the main package and dependency packages.
- Not live-tested, per spike instruction not to attempt an install.
- The risk is not the Rust binding; the risk is Windows deployment permission/licensing. Microsoft documents this area under restricted package-management capability, and Store/Game Pass package registration may require license handling that winget's download flow treats as a separate authenticated licensing call.

## Better Candidate: Store InstallControl

Winget's actual MS Store install path does not download package URLs itself. `MSStoreInstallerHandler.cpp` constructs an `MSStoreOperation`, and `MSStore.cpp` uses:

```text
AppInstallManager.StartProductInstallAsync(productId, flightId="", clientId="WinGetCli", campaignId="", installOptions)
```

For silent mode, winget sets:

```text
InstallInProgressToastNotificationMode = NoToast
CompletedInstallToastNotificationMode = NoToast
```

It then polls each `AppInstallItem.GetCurrentStatus().PercentComplete()` and aggregates progress.

This path better matches the observed "silent background install with live progress" behavior than the manual SFS/AddPackage route, and it avoids needing LiftOff to download/register Store packages directly.

## Blockers and Surprises

- The spike's assumed `SFSClientImpl.cpp` path is stale; current winget hides SFS HTTP behind an external client.
- The spike's assumption that LiftOff's current Microsoft access token can unlock Display Catalog package data is false in this live test.
- Winget's Display Catalog auth resource is BigCatalog, not Xbox Live.
- BigCatalog rejected `/consumers` token minting from LiftOff's existing MSA refresh token.
- Current winget's Store install path is InstallControl, not SFS/AddPackage.
- Manual package install likely also needs a Store license file; winget's download flow fetches one via a separate licensing resource (`c5e1cb0d-5d24-4b1a-b291-ec684152b2ba`).

## Recommended Implementation Direction

1. Prototype a no-production-code Tauri/Rust command or standalone probe for `Windows.ApplicationModel.Store.Preview.InstallControl.AppInstallManager` using an already-owned/free product ID.
2. Confirm whether `StartProductInstallAsync` works from LiftOff's unpackaged Tauri process, whether it respects current user's Store/Xbox entitlement, and whether it produces progress without launching Store/Xbox UI.
3. Only after that succeeds, spec a LiftOff install pipeline around product ID, `AppInstallOptions`, progress polling, cancellation, and library refresh.
4. Defer Display Catalog/SFS/AddPackage until there is a concrete reason to own package downloads directly. That route needs a separate auth design for BigCatalog/licensing and a permissions plan for package deployment.

