import { memo, type RefObject } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { AppListItem, CyberpunkCard, FocusRing } from "../components/ui";

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
    filteredApps,
    effectiveGameCols,
    isFocused,
    pins,
    appListView,
    appListCols,
  } = props;
  const { surface, resolvedTheme } = useTheme();
  const isPixel = surfaceStyle === "win9x";
  const isOnyx = resolvedTheme === "onyx";

              const SOURCES = ["All", "Steam", "Xbox", "Battle.net", "Other", ...customSources, ...gameCollections.map(c => c.name)];
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
            <div ref={scrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", zIndex: 2 }}>
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
                      return <GameCard key={app.id} app={app} focused={focused} isPinned={isPinned}
                        cardRef={focused ? focusedCardRef : null}
                        onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                        onDoubleClick={() => triggerLaunch(app, recent)}
                        onRightClick={(e, a) => { setContextMenu({ x: e.clientX, y: e.clientY, app: a }); }} />;
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
                          style={{ position: "relative", borderRadius: appCardRadius, aspectRatio: "1", cursor: "pointer", transition: "all 0.15s ease",
                            ...(focused ? { transform: "scale(1.06)" } : {}),
                          }}>
                          {/* Inner content — overflow:hidden clips art */}
                          <CyberpunkCard enabled={resolvedTheme === "cyberpunk"} focused={focused} accent={accent} style={{ ...glass, background: art ? "transparent" : surfaceStyle === "material" ? "var(--material-elevation-2)" : surfaceStyle === "obsidian" ? glass.background : (isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)"), backdropFilter: cardBackdropFilter, WebkitBackdropFilter: cardBackdropFilter,
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
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${effectiveGameCols}, minmax(0, 1fr))`, gap: 12, paddingBottom: 100 }}>
                {filteredApps.map((app, i) => {
                  const focused = isFocused("grid", i);
                  const isPinned = pins.includes(app.id);
                  return <GameCard key={app.id} app={app} focused={focused} isPinned={isPinned}
                    cardRef={focused ? focusedCardRef : null}
                    onClick={() => { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(i); focusIndexRef.current = i; }}
                    onDoubleClick={() => triggerLaunch(app, recent)}
                    onRightClick={(e, a) => { setContextMenu({ x: e.clientX, y: e.clientY, app: a }); }} />;
                })}
              </div>
            ) : appListView ? (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${appListCols}, minmax(0, 1fr))`, gap: 6, paddingBottom: 100 }}>
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
                      {isPinned && <PinBadge isPinned={true} small />}
                    </AppListItem>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 10, paddingBottom: 100 }}>
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
                      style={{ position: "relative", borderRadius: appGridCardRadius, aspectRatio: "1", cursor: "pointer", transition: "all 0.15s ease",
                        ...(focused ? { transform: "scale(1.06)" } : {}),
                      }}>
                      {/* Inner content — overflow:hidden clips art */}
                      <CyberpunkCard enabled={resolvedTheme === "cyberpunk"} focused={focused} accent={accent} style={{ ...glass, background: art ? "transparent" : surfaceStyle === "material" ? "var(--material-elevation-2)" : surfaceStyle === "obsidian" ? glass.background : (isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)"), backdropFilter: cardBackdropFilter, WebkitBackdropFilter: cardBackdropFilter,
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

