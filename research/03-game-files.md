# 03 — Game files: engine, storage, extraction pipeline

Researched 2026-09-26. The game was not downloaded and no Steam credentials were used.
Confidence tags: **[confirmed]** means a primary source says it. **[likely]** means strong indirect evidence. **[unverified]** means it has to be checked on the real files.

## 1. Steam identity

| Field | Value | Source |
|---|---|---|
| App ID | **3669570** (demo: 3681640, separate app) | [store](https://store.steampowered.com/app/3669570/Alchemy_Factory/), [SteamDB demo](https://steamdb.info/app/3681640/info/) |
| Developer / publisher | D5 Copperhead / Gamirror Games | Store API `appdetails` [confirmed] |
| Platforms | **Windows 64-bit only** (`oslist: windows`, `mac: false, linux: false`). There is no macOS build. | Store API + PICS [confirmed] |
| Executable | `AlchemyFactory.exe`, installdir `Alchemy Factory` | PICS `config.launch` [confirmed] |
| Content depot | **3669571**. Public manifest gid `8824314092125870973`: 3,689,018,805 B on disk, 3,509,240,544 B download (about 3.5 GB). 228989 and 228990 are the shared Steamworks redistributables (VC++/DirectX) and aren't needed. | PICS via `api.steamcmd.net/v1/info/3669570` [confirmed] |
| Current public build | buildid **25321648**, built 2026-09-15 11:38 UTC. By date this is the 1.0.49xx line; starfi5h's calculator lists `gameVersion: "1.0.4952"` as of 2026-09-14. | PICS; [starfi5h alchemy_db.js](https://github.com/starfi5h/AlchemyFactoryCalculator/blob/main/js/alchemy_db.js) |
| Other branches | `v0.5.4539`, `v0.4.4.4323`, `v0.4.3.4138`, `v0.4.2.3946`, `stable-3692` (v0.4.0.3692). Old versions can be downloaded for diffing. | PICS [confirmed] |
| 1.0 release | 2026-09-08. Hotfix 1.0.4917 followed within about 24 h. | [1.0 patch notes](https://store.steampowered.com/news/app/3669570/view/672879191292642135) |
| Store size | "3 GB available space" | Store API |
| Steam features | Workshop (used for factory **blueprints**), Cloud, Co-op | Store API, [Workshop](https://steamcommunity.com/app/3669570/workshop/) |
| Cloud saves | `%LOCALAPPDATA%/AlchemyFactory/Saved/SaveGames/*.sav`; blueprints at `.../Saved/Blueprints/*.af` + `*.png` | PICS `ufs` [confirmed] |

SteamDB pages (`steamdb.info/app/3669570/*`) return 403 (Cloudflare) to scripted fetches. The same PICS data comes from the public `https://api.steamcmd.net/v1/info/3669570`, which needs no login.

## 2. Engine

**Unreal Engine 5.7.4**, CL 51494982, branch `++UE5+Release-5.7`. It is a native C++/Blueprint build, not Unity. **[confirmed]**
- The Nexus "Alchemy Tools" page says so explicitly: "Engine: Unreal Engine 5.7.4 (CL 51494982, `++UE5+Release-5.7`)". [Nexus mod 5](https://www.nexusmods.com/alchemyfactory/mods/5), uploaded 2026-04-18.
- The Steel Drawer mod (uploaded 2026-09-17) targets "Alchemy Factory 1.0 (UE 5.7, CL 51494982)", so the engine didn't change for 1.0. [Nexus mod 14](https://www.nexusmods.com/alchemyfactory/mods/14)
- Steam forum crash threads say "Unreal Engine (Fatal error!)" and "RHIThread". [thread](https://steamcommunity.com/app/3669570/discussions/0/684113723162448014/)
- Project name `AlchemyFactory`, layout `AlchemyFactory\Binaries\Win64\`, `AlchemyFactory\Content\Paks\`. (Nexus mods 5, 6, 10, 14)

### Container format
- **IoStore (Zen)**: `.utoc` / `.ucas` plus a small `.pak`. Mods ship as `X_P.pak/.utoc/.ucas`, and the Alchemy Tools readme lists `retoc --version UE5_7` as working. [confirmed] (Nexus mods 5, 10, 14)
- **AES encryption: [likely none, unverified].** The game isn't listed in [FModel/Unreal-Game-Keys](https://github.com/FModel/Unreal-Game-Keys), and the Alchemy Tools tooling table (FModel/retoc/UE4SS) never mentions a key. `retoc info` on the real files will settle it. If the files are encrypted, the key can be pulled from the exe with standard AES-finder tools ([guide](https://github.com/Cracko298/UE4-AES-Key-Extracting-Guide)), and that step is Windows-leaning.
- **Unversioned properties → a `.usmap` mappings file is required.** UE5 cooked assets serialize property tags by index, so FModel/CUE4Parse can't read class properties without it. [Unofficial Modding Guide](https://unofficial-modding-guide.com/posts/ue4ss_and_mappings/), [TCRF](https://tcrf.net/Help:Contents/Finding_Content/Game_Engines/Unreal_Engine_5/Mappings). Alchemy Tools ships a `Mappings.usmap`, but it was built from an **April 2026 (v0.4.x) build**, before 1.0.
- **Compression: [unverified]**, probably Oodle (the UE5 default). This matters on macOS, see §6.

## 3. Where recipe data lives

Evidence from mod authors who reverse-engineered the cooked data:
- The Steel Drawer mod adds a building with its recipe (10 Bronze Ingot + 10 Steel Gear), a research unlock and bilingual text **purely through data**. The mod notes it conflicts with other mods that edit **`DT_Buildings`, `DT_SkillPoints`, `DT_Workbench`** and localization tables, and that it is compatible with "item-table mods (e.g. BigStacksPak)". So buildings, research/skills, workbench recipes and items are all **DataTables** in cooked assets. [confirmed] ([Nexus mod 14](https://www.nexusmods.com/alchemyfactory/mods/14))
- BigStacks changes max stack for 162 items by swapping a single `.ucas`, which confirms an item DataTable. [confirmed] ([Nexus mod 10](https://www.nexusmods.com/alchemyfactory/mods/10))
- The exact asset names and paths for the item and machine-recipe tables are **[unverified]**. Expected names are `DT_Items`/`DT_Item*`, with machine recipes in `DT_*Recipe*` or inside `DT_Buildings` rows. Find them by listing `DT_*` in FModel/CUE4Parse (see §6 step 6).
- Display names come from **localization tables**: `Content/Localization/Game/<culture>/Game.locres` and/or StringTables. 10 languages ship, and the Czech mod replaces the French locres. [likely] ([Nexus mod 1](https://www.nexusmods.com/alchemyfactory/mods/1))
- Some logic is hard-coded in C++, for example the slot-stack clamp `min(container override, item max)` that Steel Drawer has to patch in the exe (Nexus mod 14). Some formulas (speed or skill multipliers, heat and nutrient maths) may therefore be **code, not data**, and would have to be taken from existing calculators or tested in-game. [likely]
- Save files (`*.sav`) are standard UE GVAS and hold player state, not recipe definitions. They can be read with [uesave-rs](https://github.com/trumank/uesave-rs) if we ever want to import a player's factory. Not needed for the recipe DB.

## 4. Existing tools, datamines, mods, community

| Resource | What it is | Use to us |
|---|---|---|
| [Alchemy Tools (Nexus #5)](https://www.nexusmods.com/alchemyfactory/mods/5) | UE4SS signatures for UE 5.7, `Mappings.usmap`, compat table (FModel ✓ `GAME_UE5_7`; UAssetGUI ✗, max UE 5.5; retoc ✓; UE4SS ✓ with 4 manual AOB signatures) | **The usmap is the key input.** Downloading it needs a free Nexus account. It predates 1.0. |
| [BigStacks (#10)](https://www.nexusmods.com/alchemyfactory/mods/10), [Steel Drawer (#14)](https://www.nexusmods.com/alchemyfactory/mods/14), StabilityFree (#6), FlightFreedom (#12), ElevatorFreedom (#13), CZ/KR localization (#1, #2), CE table (#4) | Pak/UE4SS mods | Confirm DataTable-driven data. Steel Drawer credits [jmap](https://github.com/trumank/jmap) (UE reflection dump), UAssetAPI and Iced. |
| [starfi5h/AlchemyFactoryCalculator](https://github.com/starfi5h/AlchemyFactoryCalculator) (fork of [joejoesgit](https://github.com/joejoesgit/AlchemyFactoryCalculator)) | Web calculator. `js/alchemy_db.js` (68 KB) has items with numeric in-game-looking `id`s, machines and recipes. DB v56, `gameVersion 1.0.4952`, updated 2026-09-25. **No license file.** | Best **cross-check/oracle** for our extracted data. Provenance isn't stated, apparently hand-maintained. We can't copy it without permission. |
| [XDPierre/AlchemyFactoryCalculator](https://github.com/XDPierre/AlchemyFactoryCalculator) | Python CLI with recipes in a dict (MIT, last push 2025-12) | Stale |
| [alchemy-factory-codex.com](https://alchemy-factory-codex.com/recipes/) and other wikis | Recipe wiki showing "Game Version 0.5.4471". No source or export stated. | Cross-check only |
| Thunderstore / BepInEx / MelonLoader | Not applicable: those are Unity loaders. The UE equivalent is [UE4SS](https://github.com/UE4SS-RE/RE-UE4SS). | — |
| Modding Discord | None found **[unverified]** | — |

## 5. Legality / ToS (brief)

- The store page lists no game-specific EULA (`legal_notice: null`), so the [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/) applies. Reading files from a copy you own for a non-commercial fan tool is the norm in the factory-game scene (Satisfactory, Factorio and DSP calculators all do this). There is an active Nexus mod scene and the devs support Workshop; I found no statement from D5 Copperhead forbidding mods.
- Rules to follow: **publish only derived facts** (numbers, names, ratios), never raw `.uasset`/`.pak` files or large icon/art dumps. Get your own copy through your own Steam account, and don't use sites like skidrowreloaded. Don't redistribute the Nexus usmap: its permissions forbid re-upload. Credit the game and the devs.
- Display names are the developer's text, and translations are theirs too. Using them in a fan tool is typical, but it is a gray area, not a license.

## 6. Recommended pipeline (macOS Apple Silicon, headless)

Steps 1–4 run natively on macOS. Step 5 is the only risky one.

1. **Install the tools.**
   - DepotDownloader: `brew tap steamre/tools && brew install depotdownloader`. It is cross-platform, macOS arm64 is supported, and it can target another OS with `-os windows`. [README](https://github.com/SteamRE/DepotDownloader)
   - retoc: `retoc_cli-aarch64-apple-darwin.tar.xz` from [releases](https://github.com/trumank/retoc/releases) (v0.1.5). It downloads the macOS Oodle dylib itself (`liboo2coremac64.2.9.10.dylib`, see [oodle_loader](https://github.com/trumank/repak/blob/master/oodle_loader/src/lib.rs)).
   - .NET 8+ SDK, for CUE4Parse.
2. **Look at the depot file list first** (about 1 MB). The user runs this and logs in with their own account; Steam Guard works via code or `-qr`:
   ```sh
   depotdownloader -app 3669570 -depot 3669571 -os windows -osarch 64 \
     -manifest-only -username <you> -remember-password -dir af-manifest
   ```
3. **Download only the paks**, skipping binaries and movies where possible:
   ```sh
   echo 'regex:^AlchemyFactory/Content/Paks/.*' > filelist.txt
   depotdownloader -app 3669570 -depot 3669571 -os windows -osarch 64 \
     -filelist filelist.txt -username <you> -remember-password -dir af-game
   ```
   Expect up to about 3.5 GB. Once step 6 shows which pakchunk holds `DT_*`, the regex can be narrowed for future builds. Pass `-branch v0.5.4539` or `-manifest <gid>` to diff old versions.
   Alternatives: SteamCMD (`steamcmd +@sSteamCmdForcePlatformType windows +login <you> +app_update 3669570 validate +quit`), which is heavier and downloads everything. Or copy `...\steamapps\common\Alchemy Factory\AlchemyFactory\Content\Paks` from a Windows PC.
4. **Check the containers.** `retoc info af-game/AlchemyFactory/Content/Paks/<name>.utoc` and `retoc list ... | grep -i '/DT_'` show the encryption flag, compression method and where the DataTables are.
5. **Get mappings.** Download `Mappings.usmap` from [Nexus #5](https://www.nexusmods.com/alchemyfactory/mods/5) by hand (free account). If step 6 fails to parse rows with it because 1.0 changed structs, regenerate it. That requires **running the game on Windows** with UE4SS (these signatures, `[EngineVersionOverride] 5.7`, then *Dump .usmap*) or with [jmap](https://github.com/trumank/jmap). There's no known static way to generate it on a Mac. [risk]
6. **Export DataTables to JSON with CUE4Parse**, in a small .NET console app (about 40 lines):
   ```csharp
   var p = new DefaultFileProvider("af-game/AlchemyFactory/Content/Paks", SearchOption.TopDirectoryOnly,
       new VersionContainer(EGame.GAME_UE5_7));
   p.MappingsContainer = new FileUsmapTypeMappingsProvider("Mappings.usmap");
   p.Initialize(); p.SubmitKey(new FGuid(), new FAesKey(new byte[32])); // unencrypted assumption; else real key
   foreach (var f in p.Files.Keys.Where(k => k.Contains("/DT_") && k.EndsWith(".uasset")))
       File.WriteAllText(Out(f), JsonConvert.SerializeObject(p.LoadPackage(f).GetExports(), Formatting.Indented));
   // + p.LoadLocalization(ELanguage.English) / read Game.locres for display names
   ```
   API names follow the current [CUE4Parse README](https://github.com/FabianFG/CUE4Parse). Check them against the version you install, since `LoadAllObjects` vs `LoadPackage` changes between releases. `EGame.GAME_UE5_7` exists in current `master` ([EGame.cs](https://github.com/FabianFG/CUE4Parse/blob/master/CUE4Parse/UE4/Versions/EGame.cs)).
   **macOS catch:** CUE4Parse's Oodle auto-download only handles Windows and Linux ([OodleHelper.cs](https://github.com/FabianFG/CUE4Parse/blob/master/CUE4Parse/Compression/OodleHelper.cs)). If the containers are Oodle-compressed, there are three workarounds:
   - (a) Run the exporter in Docker, `docker run --platform linux/amd64 mcr.microsoft.com/dotnet/sdk:8.0 ...`. CUE4Parse then fetches the Linux Oodle itself.
   - (b) Point `OodleHelper` at the macOS dylib retoc downloaded. [unverified]
   - (c) `retoc to-legacy <Paks> legacy_P.pak` first, then read the legacy pak. [unverified whether the output is uncompressed]

   Option (a) is the most predictable.
   GUI alternative: [FModel](https://github.com/4sval/FModel) (Windows-only WPF): set UE version `GAME_UE5_7`, load the usmap, right-click `DT_*` → *Save Properties (.json)*. Good for exploring once on a Windows box or VM. It is not scriptable.
7. **Normalize.** Write a small script (Python or TS) that turns `DT_*.json` + locres into our schema (items, machines, recipes with input/output amounts, craft time, machine speed, power/heat/nutrients). Keep the extractor output in `data/raw/<buildid>/` (gitignored) and commit only the normalized JSON.
8. **Validate** against starfi5h `alchemy_db.js` (`gameVersion 1.0.4952`) by recipe count and per-recipe amounts and times. Every diff is either a parse or schema bug on our side or a formula that lives in code (see §3).
9. **Update loop.** Poll `api.steamcmd.net/v1/info/3669570` for `branches.public.buildid` (no login needed). When it changes, rerun steps 3 and 6–8.

## 7. Open risks

1. **usmap freshness.** The only public usmap predates 1.0. If 1.0 changed row structs, parsing fails or silently misreads fields, and regenerating it needs the game running on Windows (UE4SS or jmap). A Mac has no native path; CrossOver/Whisky with UE 5.7 + UE4SS is untested.
2. **Oodle on macOS for CUE4Parse.** Needs a workaround, most reliably Docker linux/amd64 (see step 6).
3. **Encryption not verified.** If the paks are AES-encrypted, key extraction is exe work, typically done on Windows.
4. **Some mechanics are in C++, not DataTables** (clamps and possibly speed, heat or skill multipliers). The extracted data may need hand-coded formulas cross-checked in-game.
5. **Table and asset names are unverified** (`DT_Workbench`/`DT_Buildings`/`DT_SkillPoints` are confirmed to exist; the item and machine-recipe table names are guesses).
6. **Steam login is the user's own.** DepotDownloader needs their credentials and Steam Guard. The app must be owned by that account.
7. **Tooling drift.** UE 5.7 support is recent in CUE4Parse and retoc, and UAssetGUI doesn't support 5.7 at all. Pin tool versions per game build.
8. **Legal.** Publish only derived data. No asset dumps, no usmap redistribution, no copying of the unlicensed starfi5h DB.

### Fetch notes
Nexus pages were read through a reader proxy (`r.jina.ai`) because nexusmods.com and steamdb.info return 403 to direct fetches. App and depot data come from the Steam Store `appdetails` API and the public PICS mirror `api.steamcmd.net`.
