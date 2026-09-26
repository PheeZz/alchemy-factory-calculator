using CUE4Parse.Compression;
using CUE4Parse.Encryption.Aes;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Jmap;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Core.Misc;
using CUE4Parse.UE4.Versions;
using Newtonsoft.Json;

// usage: extractor <paksDir> <outDir> [mappings.usmap|.jmap] [pathFilter...]
// without usmap: only lists packages (unversioned properties can't be decoded without it)
var (paks, outDir) = (args[0], args[1]);
var usmap = args.Length > 2 && (args[2].EndsWith(".usmap") || args[2].EndsWith(".jmap")) ? args[2] : null;
var filters = args.Skip(usmap is null ? 2 : 3).DefaultIfEmpty("/DT_").ToArray();

OodleHelper.Initialize();

var provider = new DefaultFileProvider(paks, SearchOption.TopDirectoryOnly, new VersionContainer(EGame.GAME_UE5_7));
// .jmap = reflection dumped from the running build (jmap_dumper); public .usmap predates 1.0 and yields empty rows
if (usmap is not null)
    provider.MappingsContainer = usmap.EndsWith(".jmap") ? new JmapTypeMappingsProvider(usmap) : new FileUsmapTypeMappingsProvider(usmap);
provider.Initialize();
// zero key: assumes unencrypted containers; RequiredKeys below tells otherwise
provider.SubmitKey(new FGuid(), new FAesKey(new byte[32]));
// cultures come from .locres present in paks; missing "en" just leaves FText source strings
provider.TryChangeCulture("en");

Directory.CreateDirectory(outDir);
Console.WriteLine($"mounted={provider.MountedVfs.Count} unloaded={provider.UnloadedVfs.Count} required-keys={provider.RequiredKeys.Count} files={provider.Files.Count}");

var matches = provider.Files.Keys
    .Where(k => k.EndsWith(".uasset") && filters.Any(f => k.Contains(f, StringComparison.OrdinalIgnoreCase)))
    .Order().ToList();
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
