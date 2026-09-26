using CUE4Parse.Compression;
using CUE4Parse.Encryption.Aes;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Jmap;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Assets.Exports.Texture;
using CUE4Parse.UE4.Localization;
using CUE4Parse.UE4.Objects.Core.Misc;
using CUE4Parse.UE4.Versions;
using CUE4Parse_Conversion.Options;
using CUE4Parse_Conversion.Textures;
using Newtonsoft.Json;

// usage: extractor <json|locres|icons> <paksDir> <outDir> [mappings.usmap|.jmap] [pathFilter...]
//   json   — export matching .uasset packages as JSON (default filter /DT_); without mappings only lists packages
//   locres — dump Localization/Game/<culture>/Game.locres as {namespace: {key: text}} per culture
//   icons  — decode matching Texture2D packages to PNG
var mode = args[0];
var (paks, outDir) = (args[1], args[2]);
var usmap = args.Length > 3 && (args[3].EndsWith(".usmap") || args[3].EndsWith(".jmap")) ? args[3] : null;
var filters = args.Skip(usmap is null ? 3 : 4).DefaultIfEmpty("/DT_").ToArray();

OodleHelper.Initialize();

var provider = new DefaultFileProvider(paks, SearchOption.TopDirectoryOnly, new VersionContainer(EGame.GAME_UE5_7));
// .jmap = reflection dumped from the running build (jmap_dumper); public .usmap predates 1.0 and yields empty rows
if (usmap is not null)
    provider.MappingsContainer = usmap.EndsWith(".jmap") ? new JmapTypeMappingsProvider(usmap) : new FileUsmapTypeMappingsProvider(usmap);
provider.Initialize();
// zero key: assumes unencrypted containers; RequiredKeys below tells otherwise
provider.SubmitKey(new FGuid(), new FAesKey(new byte[32]));

Directory.CreateDirectory(outDir);
Console.WriteLine($"mounted={provider.MountedVfs.Count} unloaded={provider.UnloadedVfs.Count} required-keys={provider.RequiredKeys.Count} files={provider.Files.Count}");

switch (mode)
{
    case "json": ExportJson(); break;
    case "locres": ExportLocres(); break;
    case "icons": ExportIcons(); break;
    default: throw new ArgumentException($"unknown mode {mode}");
}

List<string> Match(string ext) => provider.Files.Keys
    .Where(k => k.EndsWith(ext) && filters.Any(f => k.Contains(f, StringComparison.OrdinalIgnoreCase)))
    .Order().ToList();

void ExportJson()
{
    var matches = Match(".uasset");
    File.WriteAllLines(Path.Combine(outDir, "_packages.txt"), matches);
    File.WriteAllLines(Path.Combine(outDir, "_all_files.txt"), provider.Files.Keys.Order());
    Console.WriteLine($"matched {matches.Count} packages for [{string.Join(", ", filters)}]");
    if (usmap is null) return;
    var failed = 0;
    foreach (var path in matches)
    {
        try
        {
            var exports = provider.LoadPackage(path).GetExports();
            var target = Path.Combine(outDir, path.Replace(".uasset", ".json"));
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.WriteAllText(target, JsonConvert.SerializeObject(exports, Formatting.Indented));
        }
        catch (Exception e)
        {
            failed++;
            Console.Error.WriteLine($"FAIL {path}: {e.Message}");
        }
    }
    Console.WriteLine($"exported {matches.Count - failed}/{matches.Count}");
}

// Read .locres directly: TryChangeCulture("en") silently left FText in the source (zh) language.
void ExportLocres()
{
    var files = provider.Files.Keys.Where(k => k.StartsWith("AlchemyFactory/Content/Localization/Game/") && k.EndsWith(".locres")).Order();
    foreach (var path in files)
    {
        var culture = Path.GetFileName(Path.GetDirectoryName(path))!;
        var res = new FTextLocalizationResource(provider.CreateReader(path));
        var dump = res.Entries.ToDictionary(
            ns => ns.Key.Str,
            ns => ns.Value.ToDictionary(e => e.Key.Str, e => e.Value.LocalizedString));
        File.WriteAllText(Path.Combine(outDir, $"{culture}.json"), JsonConvert.SerializeObject(dump, Formatting.Indented));
        Console.WriteLine($"{culture}: {dump.Values.Sum(v => v.Count)} entries");
    }
}

void ExportIcons()
{
    var matches = Match(".uasset");
    var failed = 0;
    foreach (var path in matches)
    {
        try
        {
            if (provider.LoadPackage(path).GetExports().OfType<UTexture2D>().FirstOrDefault() is not { } texture) continue;
            var bitmap = texture.Decode() ?? throw new InvalidOperationException("decode returned null");
            var png = bitmap.Encode(ETextureFormat.Png, false, out _);
            // write ourselves: CUE4Parse's exporter on Linux emits names with literal backslashes
            var target = Path.Combine(outDir, path.Replace(".uasset", ".png"));
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.WriteAllBytes(target, png);
        }
        catch (Exception e)
        {
            failed++;
            Console.Error.WriteLine($"FAIL {path}: {e.Message}");
        }
    }
    Console.WriteLine($"icons {matches.Count - failed}/{matches.Count}");
}
