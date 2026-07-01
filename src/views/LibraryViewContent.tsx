import { memo, type RefObject } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { AppListItem, CyberpunkCard, FocusRing } from "../components/ui";
import { GamepadBtn } from "../components/GamepadBtn";

export interface LibraryViewContentProps {
  tab: "Games" | "Apps";
  active?: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  wideLayout: boolean;
  [key: string]: any;
}

function LibraryViewContentBase(props: LibraryViewContentProps) {
  const {
    tab,
    scrollRef,
    wideLayout,
    customSources,
    gameCollections,
    appCollections,
    accent,
    isDark,
    theme,
    surfaceStyle,
    t,
    gameSourceTab,
    gameSourceTabs,
    installFilter,
    setInstallFilter,
    showInstallToolbarFilters = true,
    viewbarSortIndex,
    viewbarFocus,
    viewbarIndex,
    setViewbarIndex,
    sortOpen,
    setSortOpen,
    sortKbIndex,
    setSortKbIndex,
    gamesSort,
    setGamesSort,
    visibleGameCount,
    appCollectionTab,
    setAddAppType,
    setShowFileBrowser,
    setFocusSection,
    focusSectionRef,
    setSubtabFocusIndex,
    subtabFocusIndexRef,
    focusSection,
    subtabFocusIndex,
    openHideModal,
    setShowColModal,
    showColModalRef,
    pinnedAppsReactive,
    GameCard,
    focusedCardRef,
    setFocusIndex,
    focusIndexRef,
    focusIndex,
    triggerLaunch,
    openDetails,
    recent,
    setContextMenu,
    COLS,
    iconColors,
    customArt,
    glass,
    cardBackdropFilter,
    materialRaisedShadow,
    AppIcon,
    PinBadge,
    RunningBadge,
    StoreBadge,
    isRunning,
    filteredApps,
    effectiveGameCols,
    isFocused,
    pins,
    appListView,
    appListCols,
    settings,
  } = props;
  const { surface, resolvedTheme } = useTheme();
  const isPixel = surfaceStyle === "win9x";
  const isOnyx = resolvedTheme === "onyx";
  const getAppCardSurface = (art: string | undefined | null) => art
    ? { background: "transparent", backdropFilter: "none", WebkitBackdropFilter: "none" }
    : {
        background: surfaceStyle === "material" ? "var(--material-elevation-2)" : surfaceStyle === "obsidian" ? glass.background : (isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)"),
        backdropFilter: cardBackdropFilter,
        WebkitBackdropFilter: cardBackdropFilter,
      };

              const SOURCES = gameSourceTabs ?? ["All", "Steam", "Xbox", "Battle.net", "GOG", "Epic", "Other", ...customSources, ...gameCollections.map(c => c.name)];
              const APP_COLS = ["All", ...appCollections.map(c => c.name)];
              const subtabItems = tab === "Games"
                ? [...SOURCES, "manage"]
                : [...APP_COLS, "manage"];
              const addAppIdx    = tab === "Games" ? SOURCES.length     : APP_COLS.length;     // kept for hidden buttons
              const addFolderIdx = tab === "Games" ? SOURCES.length + 1 : APP_COLS.length + 1; // kept for hidden buttons
              const manageIdx    = tab === "Games" ? SOURCES.length     : APP_COLS.length;
              const colModalIdx  = tab === "Games" ? SOURCES.length + 1 : APP_COLS.length + 1; // kept for hidden buttons
              const actionBtnStyle = (active) => ({
                fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", padding: "5px 12px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease",
                background: active ? accent.primary : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                color: active ? (accent.darkText ? "#1a1a1a" : "white") : theme.textDim,
                border: `1px solid ${active ? accent.primary : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
                boxShadow: active ? (surfaceStyle === "material" ? "var(--material-shadow-medium)" : `0 2px 10px ${accent.glow}0.35)`) : (surfaceStyle === "material" ? "var(--material-shadow-low)" : "none"),
                display: "flex", alignItems: "center", justifyContent: "center",
              });
              const installFilterItems = showInstallToolbarFilters ? ["all", "installed", "notInstalled"] : [];
              const sortButtonIndex = viewbarSortIndex ?? installFilterItems.length;
              const sortItems = ["recent", "az", "store"];
              const toolbarRadius = resolvedTheme === "cyberpunk" || isPixel ? 0 : surfaceStyle === "material" ? 8 : 12;
              const toolbarFocused = viewbarFocus;
              const toolbarSurface = surfaceStyle === "material"
                ? {
                    background: toolbarFocused ? "var(--material-elevation-2)" : "var(--material-elevation-1)",
                    borderColor: toolbarFocused ? accent.primary : "var(--material-border-subtle)",
                    boxShadow: toolbarFocused ? "var(--material-shadow-high)" : "var(--material-shadow-low)",
                  }
                : isPixel
                  ? {
                      background: surface.panelBg,
                      borderColor: toolbarFocused ? accent.primary : surface.borderRaisedSoft,
                      boxShadow: toolbarFocused ? `${surface.bevelRaised}, 0 0 0 2px ${accent.primary}` : surface.bevelRaised,
                    }
                  : {
                      background: toolbarFocused
                        ? (isDark ? `${accent.glow}0.14)` : `${accent.glow}0.10)`)
                        : (isDark ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.42)"),
                      borderColor: toolbarFocused ? `${accent.glow}0.70)` : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"),
                      boxShadow: toolbarFocused
                        ? `0 0 0 1px ${accent.glow}0.42), 0 0 22px ${accent.glow}0.28), 0 8px 24px rgba(0,0,0,0.18)`
                        : "none",
                    };
              const tabContentBottomPadding = 20;
              const viewbarBtnStyle = (selected, focused) => ({
                height: 28,
                minWidth: 74,
                padding: "0 10px",
                borderRadius: resolvedTheme === "cyberpunk" || isPixel ? 0 : surfaceStyle === "material" ? 6 : 8,
                border: `1px solid ${focused ? accent.primary : selected ? `${accent.glow}0.45)` : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`,
                background: selected
                  ? (surfaceStyle === "material" ? accent.primary : `${accent.glow}0.22)`)
                  : (isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.035)"),
                color: selected && surfaceStyle === "material" ? (accent.darkText ? "#1a1a1a" : "white") : focused ? theme.text : theme.textDim,
                fontSize: 11,
                fontWeight: selected || focused ? 700 : 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease",
                boxShadow: focused
                  ? (surfaceStyle === "material" ? "var(--material-shadow-high)" : `0 0 0 2px ${accent.glow}0.40), 0 0 20px ${accent.glow}0.34), 0 3px 12px rgba(0,0,0,0.24)`)
                  : "none",
              });
              const sortPopupStyle = {
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 20,
                minWidth: 150,
                padding: 5,
                borderRadius: toolbarRadius,
                border: `1px solid ${surfaceStyle === "material" ? "var(--material-border-subtle)" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                background: surfaceStyle === "material"
                  ? "var(--material-elevation-3)"
                  : isPixel
                    ? surface.panelBg
                    : isDark ? "rgba(18,16,14,0.96)" : "rgba(252,248,244,0.96)",
                boxShadow: surfaceStyle === "material" ? "var(--material-shadow-high)" : "0 12px 32px rgba(0,0,0,0.32)",
                backdropFilter: surfaceStyle === "material" ? undefined : "blur(18px) saturate(140%)",
                WebkitBackdropFilter: surfaceStyle === "material" ? undefined : "blur(18px) saturate(140%)",
              };
              const sortItemStyle = (selected, focused) => ({
                width: "100%",
                height: 30,
                padding: "0 9px",
                border: `1px solid ${focused ? accent.primary : "transparent"}`,
                borderRadius: resolvedTheme === "cyberpunk" || isPixel ? 0 : 6,
                background: focused ? `${accent.glow}0.18)` : selected ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent",
                color: focused ? theme.text : theme.textDim,
                fontSize: 11,
                fontWeight: selected ? 700 : 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              });

              // Build tab items for SectionTabBar
              const tabItems = tab === "Games"
                ? SOURCES.map(src => ({
                    label: src === "All" ? t('sources.all') : src === "Other" ? t('sources.other') : src,
                    isDashed: gameCollections.some(c => c.name === src),
                  }))
                : APP_COLS.map(col => ({ label: col === "All" ? t('sources.all') : col }));

              const activeTabIndex = tab === "Games"
                ? SOURCES.indexOf(gameSourceTab)
                : APP_COLS.indexOf(appCollectionTab);

              return (
            <div ref={scrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", overscrollBehavior: "contain", zIndex: 2, paddingTop: "var(--header-height)", paddingBottom: "var(--bottom-bar-height)", boxSizing: "border-box" }}>
              <div style={{ padding: "0 24px 0", ...(wideLayout ? {} : { maxWidth: 1400, margin: "0 auto" }), width: "100%", boxSizing: "border-box" }}>
                {/* Action buttons — hidden; kept for potential future use */}
                <div style={{ display: "none" }}>
                  <div onClick={() => { setAddAppType(tab === "Games" ? "game" : "app"); setShowFileBrowser("file"); setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(addAppIdx); subtabFocusIndexRef.current = addAppIdx; }}
                    style={{ ...actionBtnStyle(focusSection === "subtabs" && subtabFocusIndex === addAppIdx), padding: "5px 10px" }}
                    title={tab === "Games" ? t('addEntry.addGame') : t('addEntry.addApp')}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div onClick={() => { setAddAppType(tab === "Games" ? "game" : "app"); setShowFileBrowser("folder"); setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(addFolderIdx); subtabFocusIndexRef.current = addFolderIdx; }}
                    style={{ ...actionBtnStyle(focusSection === "subtabs" && subtabFocusIndex === addFolderIdx), padding: "5px 10px" }}
                    title={t('addEntry.addFolder')}>
                    <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
                      <path d="M1 3.5a1 1 0 011-1h3.8l1.4 1.5H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V3.5z" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M8 6.5v3M6.5 8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div onClick={() => { openHideModal(); setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(manageIdx); subtabFocusIndexRef.current = manageIdx; }}
                    style={actionBtnStyle(focusSection === "subtabs" && subtabFocusIndex === manageIdx)}>
                    {t('grid.manage')}
                  </div>
                  <div onClick={() => { setShowColModal(true); showColModalRef.current = true; setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(colModalIdx); subtabFocusIndexRef.current = colModalIdx; }}
                    style={actionBtnStyle(focusSection === "subtabs" && subtabFocusIndex === colModalIdx)}>
                    {t('collections.manage')}
                  </div>
                </div>

            {/* ── PINNED — same card size/style as main grid ── */}
            {tab === "Games" && (
              <div
                className="view-toolbar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 42,
                  margin: "8px 0 4px",
                  padding: "7px 10px",
                  borderRadius: toolbarRadius,
                  border: `1px solid ${toolbarSurface.borderColor}`,
                  background: toolbarSurface.background,
                  boxShadow: toolbarSurface.boxShadow,
                  boxSizing: "border-box",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: theme.textDim, fontSize: 11, fontWeight: 700, flex: "0 0 auto" }}>
                  <GamepadBtn btn="RS" label={t("grid.filter.dock")} style={{ gap: 5, fontSize: 11 }} />
                </span>
                {installFilterItems.length > 0 && (
                  <div
                    role="tablist"
                    aria-label={t("grid.filter.dock")}
                    style={{
                      display: "flex",
                      gap: 4,
                      padding: 3,
                      borderRadius: resolvedTheme === "cyberpunk" || isPixel ? 0 : 9,
                      background: isDark ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.045)",
                      flex: "0 1 auto",
                      minWidth: 0,
                    }}
                  >
                    {installFilterItems.map((key, i) => {
                      const selected = installFilter === key;
                      const focused = viewbarFocus && viewbarIndex === i;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => {
                            setViewbarIndex(i);
                            setInstallFilter(key);
                            setFocusSection("viewbar");
                            focusSectionRef.current = "viewbar";
                            setFocusIndex(0);
                            focusIndexRef.current = 0;
                            setSortOpen(false);
                          }}
                          style={viewbarBtnStyle(selected, focused)}
                        >
                          {t(`grid.filter.${key}`)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 700, flex: "0 0 auto" }}>
                  {t("grid.count", { count: visibleGameCount })}
                </span>
                <div style={{ marginLeft: "auto", position: "relative", flex: "0 0 auto" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setViewbarIndex(sortButtonIndex);
                      setFocusSection("viewbar");
                      focusSectionRef.current = "viewbar";
                      setSortKbIndex(Math.max(0, sortItems.indexOf(gamesSort)));
                      setSortOpen((open) => !open);
                    }}
                    style={viewbarBtnStyle(false, viewbarFocus && viewbarIndex === sortButtonIndex)}
                  >
                    {t("grid.sort.label")}: {t(`grid.sort.${gamesSort}`)} v
                  </button>
                  {sortOpen && (
                    <div role="listbox" aria-label={t("grid.sort.label")} style={sortPopupStyle}>
                      {sortItems.map((key, i) => (
                        <button
                          key={key}
                          type="button"
                          role="option"
                          aria-selected={gamesSort === key}
                          onClick={() => {
                            setGamesSort(key);
                            setSortOpen(false);
                          }}
                          style={sortItemStyle(gamesSort === key, sortKbIndex === i)}
                        >
                          <span>{t(`grid.sort.${key}`)}</span>
                          {gamesSort === key && <span aria-hidden="true">*</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {pinnedAppsReactive.length > 0 && !(tab === "Games" && gameSourceTab !== "All") && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint, padding: "18px 0 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{t('grid.pinned')}</span>
                  <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", opacity: 0.6 }}>{t('grid.unpinHint')}</span>
                </div>
                {tab === "Games" ? (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${effectiveGameCols}, minmax(0, 1fr))`, gap: 12, paddingTop: 6, marginTop: -6, paddingBottom: 14 }}>
                    {pinnedAppsReactive.map((app, i) => {
                      const focused = focusSection === "pinned" && focusIndex === i;
                      const isPinned = true;
                      return <GameCard key={app.id} app={app} focused={focused} isPinned={isPinned} calmMotion
                        isRunning={isRunning?.(app.id)}
                        cardRef={focused ? focusedCardRef : null}
                        onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                        onDoubleClick={() => triggerLaunch(app, recent)}
                        onRightClick={(_e, a) => { openDetails?.(a); }} />;
                    })}
                  </div>
                ) : appListView ? (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${appListCols}, minmax(0, 1fr))`, gap: 6, paddingTop: 6, marginTop: -6, paddingBottom: 14 }}>
                    {pinnedAppsReactive.map((app, i) => {
                      const focused = focusSection === "pinned" && focusIndex === i;
                      const art = customArt[app.id];
                      return (
                        <AppListItem
                          key={app.id}
                          ref={focused ? focusedCardRef : null}
                          variant="row"
                          name={app.name}
                          icon={art
                            ? <img src={art} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                            : <AppIcon app={app} size={40} />}
                          focused={focused}
                          onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                          onDoubleClick={() => triggerLaunch(app, recent)}
                          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, app }); }}
                        >
                          <RunningBadge show={isRunning?.(app.id)} small inline />
                          <PinBadge isPinned={true} small />
                        </AppListItem>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 10, paddingTop: 6, marginTop: -6, paddingBottom: 14 }}>
                    {pinnedAppsReactive.map((app, i) => {
                      const focused = focusSection === "pinned" && focusIndex === i;
                      const color = iconColors[app.id];
                      const art = customArt[app.id];
                      const tintBg = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : glass.background;
                      const tintBorder = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : "rgba(255,255,255,0.08)";
                      const pixelCard = isPixel ? {
                        background: surface.panelBg,
                        backdropFilter: undefined,
                        WebkitBackdropFilter: undefined,
                        border: focused ? `2px solid ${accent.primary}` : "2px solid",
                        borderColor: focused ? accent.primary : surface.borderRaisedSoft,
                        boxShadow: focused ? `0 0 0 1px ${surface.cardFocusRing}, 0 0 0 3px ${accent.primary}` : surface.bevelRaised,
                      } : {};
                      const appCardRadius = resolvedTheme === "cyberpunk" ? 0 : isPixel ? 0 : 16;
                      return (
                        // Outer wrapper — no overflow:hidden so ring can extend outside
                        <div key={app.id} data-card="" className={focused ? "focused" : ""} ref={focused ? focusedCardRef : null}
                          onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                          onDoubleClick={() => triggerLaunch(app, recent)}
                          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, app }); }}
                          style={{ position: "relative", borderRadius: appCardRadius, aspectRatio: "1", cursor: "pointer", transition: "box-shadow 0.12s ease, transform 0.08s ease",
                            ...(isOnyx ? { overflow: "visible" } : { contentVisibility: "auto", containIntrinsicSize: "auto 160px" }),
                            ...(focused ? { transform: "scale(1.025)" } : {}),
                          }}>
                          {/* Inner content — overflow:hidden clips art */}
                          <CyberpunkCard enabled={resolvedTheme === "cyberpunk"} focused={focused} accent={accent} style={{ ...glass, ...getAppCardSurface(art),
                            border: focused
                              ? (isOnyx ? "1px solid transparent" : `1px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)"}`)
                              : `1px solid ${surfaceStyle === "material" ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(43,31,20,0.05)") : art ? "rgba(255,255,255,0.12)" : tintBorder}`,
                            borderRadius: appCardRadius, overflow: "hidden", position: "absolute", inset: 0,
                            ...(focused && !isOnyx ? { boxShadow: surfaceStyle === "material" ? materialRaisedShadow : `0 0 0 1px ${accent.glow}0.3), 0 0 30px ${accent.glow}0.15)` } : {}),
                            ...pixelCard }}>
                            {art ? (
                              <>
                                <img src={art} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", zIndex: 1 }} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", zIndex: 2 }}>
                                  <div style={{ fontSize: 11, fontWeight: 500, color: "white", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", position: "relative", zIndex: 1 }}>
                                  <AppIcon app={app} size={44} />
                                </div>
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 10px 10px", zIndex: 1 }}>
                                  <div style={{ fontSize: 11, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                                </div>
                              </>
                            )}
                            <PinBadge isPinned={true} small />
                            <RunningBadge show={isRunning?.(app.id)} small />
                            <StoreBadge source={app.source} small />
                          </CyberpunkCard>
                          {/* Ring — outside overflow:hidden, with gap */}
                          <FocusRing focused={focused} variant="spin" elementRadius={appCardRadius} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── FULL GRID ── */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint, padding: "18px 0 10px" }}>
              {tab}
              <span style={{ color: isDark ? "rgba(245,237,232,0.2)" : "rgba(42,26,14,0.2)", fontWeight: 400 }}> ({filteredApps.length})</span>
            </div>

            {tab === "Games" ? (
              filteredApps.length === 0 ? (
                <div style={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: tabContentBottomPadding }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.textDim, textAlign: "center" }}>
                    {installFilter === "notInstalled" ? t("grid.empty.noUninstalled") : t("home.noGames")}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${effectiveGameCols}, minmax(0, 1fr))`, gap: 12, paddingBottom: tabContentBottomPadding }}>
                  {filteredApps.map((app, i) => {
                    const focused = isFocused("grid", i);
                    const isPinned = pins.includes(app.id);
                    return <GameCard key={app.id} app={app} focused={focused} isPinned={isPinned} calmMotion
                      isRunning={isRunning?.(app.id)}
                      cardRef={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recent)}
                      onRightClick={(_e, a) => { openDetails?.(a); }} />;
                  })}
                </div>
              )
            ) : appListView ? (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${appListCols}, minmax(0, 1fr))`, gap: 6, paddingBottom: tabContentBottomPadding }}>
                {filteredApps.map((app, i) => {
                  const focused = isFocused("grid", i);
                  const isPinned = pins.includes(app.id);
                  const art = customArt[app.id];
                  return (
                    <AppListItem
                      key={app.id}
                      ref={focused ? focusedCardRef : null}
                      variant="row"
                      name={app.name}
                      icon={art
                        ? <img src={art} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                        : <AppIcon app={app} size={40} />}
                      focused={focused}
                      onClick={() => { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recent)}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, app }); }}
                    >
                      <RunningBadge show={isRunning?.(app.id)} small inline />
                      {isPinned && <PinBadge isPinned={true} small />}
                    </AppListItem>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 10, paddingBottom: tabContentBottomPadding }}>
                {filteredApps.map((app, i) => {
                  const focused = isFocused("grid", i);
                  const isPinned = pins.includes(app.id);
                  const color = iconColors[app.id];
                  const art = customArt[app.id];
                  const tintBg = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : glass.background;
                  const tintBorder = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : "rgba(255,255,255,0.08)";
                  const pixelCard = isPixel ? {
                    background: surface.panelBg,
                    backdropFilter: undefined,
                    WebkitBackdropFilter: undefined,
                    border: focused ? `2px solid ${accent.primary}` : "2px solid",
                    borderColor: focused ? accent.primary : surface.borderRaisedSoft,
                    boxShadow: focused ? `0 0 0 1px ${surface.cardFocusRing}, 0 0 0 3px ${accent.primary}` : surface.bevelRaised,
                  } : {};
                  const appGridCardRadius = resolvedTheme === "cyberpunk" ? 0 : isPixel ? 0 : 16;
                  return (
                    // Outer wrapper — no overflow:hidden so ring can extend outside
                    <div key={app.id} data-card="" className={focused ? "focused" : ""} ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recent)}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, app }); }}
                      style={{ position: "relative", borderRadius: appGridCardRadius, aspectRatio: "1", cursor: "pointer", transition: "box-shadow 0.12s ease, transform 0.08s ease",
                        ...(isOnyx ? { overflow: "visible" } : { contentVisibility: "auto", containIntrinsicSize: "auto 160px" }),
                        ...(focused ? { transform: "scale(1.025)" } : {}),
                      }}>
                      {/* Inner content — overflow:hidden clips art */}
                      <CyberpunkCard enabled={resolvedTheme === "cyberpunk"} focused={focused} accent={accent} style={{ ...glass, ...getAppCardSurface(art),
                        border: focused
                          ? (isOnyx ? "1px solid transparent" : `1px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)"}`)
                          : `1px solid ${surfaceStyle === "material" ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(43,31,20,0.05)") : art ? "rgba(255,255,255,0.12)" : tintBorder}`,
                        borderRadius: appGridCardRadius, overflow: "hidden", position: "absolute", inset: 0,
                        ...(focused && !isOnyx ? { boxShadow: surfaceStyle === "material" ? materialRaisedShadow : `0 0 0 1px ${accent.glow}0.3), 0 0 30px ${accent.glow}0.15)` } : {}),
                        ...pixelCard }}>
                        {art ? (
                          <>
                            <img src={art} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", zIndex: 1 }} />
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", zIndex: 2 }}>
                              <div style={{ fontSize: 11, fontWeight: 500, color: "white", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", position: "relative", zIndex: 1 }}>
                              <AppIcon app={app} size={44} />
                            </div>
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 10px 10px", zIndex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                            </div>
                          </>
                        )}
                        <PinBadge isPinned={isPinned} small />
                        <RunningBadge show={isRunning?.(app.id)} small />
                        <StoreBadge source={app.source} small />
                      </CyberpunkCard>
                      {/* Ring — outside overflow:hidden, with gap */}
                      <FocusRing focused={focused} variant="spin" elementRadius={appGridCardRadius} />
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            </div>
          );
}

export const LibraryViewContent = memo(LibraryViewContentBase, (prev, next) => {
  if (!prev.active && !next.active) return true;
  return false;
});

