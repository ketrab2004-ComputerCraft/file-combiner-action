import * as fs from "node:fs/promises";
import * as core from "@actions/core";
import { glob } from "glob";
import { Minify as minify, Settings as LuaFormatSettings } from "lua-format";


const SPLIT_STRING = (() => {
    let toReturn = ''

    for (let i = 1; i < 255; i++) {
        toReturn += String.fromCharCode(i);
    }

    return toReturn;
})();


async function main(): Promise<void> {
    try {
        const outFile = core.getInput("out_file");
        if (outFile === '') throw new Error(`'out_file' is not set`);

        const rawGlob = core.getInput("glob");
        if (rawGlob === '') throw new Error(`'glob' is not set`);
        const globs = rawGlob.split("\n");

        const rawIgnore = core.getInput("ignore_glob");
        let tempIgnore = new Array<string>();
        if (rawIgnore != '') {
            tempIgnore = rawIgnore.split("\n");
        }
        const ignores = tempIgnore;

        const minimize = core.getBooleanInput("minimize_lua");
        const minimizeOptions: LuaFormatSettings = {
            RenameGlobals: core.getBooleanInput("lua_rename_globals"),
            RenameVariables: core.getBooleanInput("lua_rename_variables"),
            SolveMath: core.getBooleanInput("lua_solve_math")
        }



        let combinedFiles = 0,
            minimizedFiles = 0;

        const blocks = new Array<[path: string, contents: string]>();
        const results = await glob(globs, {
            ignore: ignores
        });

        results.forEach(async path => {
            const stat = await fs.stat(path);

            if (!stat.isFile()) {
                core.warning(`Globs matched non-file ${path}`, {
                    file: path,
                    title: "Globs matched non-file"
                })
                return;
            }

            let contents = (await fs.readFile(path)).toString();

            if (minimize && path.match(/.*\.[lL][uU][aA]$/)) {
                contents = minify(contents, minimizeOptions);

                contents = contents.replace(/^.*\n\n(.*)/, "$1"); // remove everything before the first two newlines (watermark)

                minimizedFiles++;
            }

            blocks.push([path, contents]);
            combinedFiles++;
        });

        const combinedBlocks = await Promise.all( blocks.map(async ([path, contents]) => {
            return `${path}\n\n${contents}`;
        }) );

        const content = combinedBlocks.concat( `${SPLIT_STRING}\n` );

        await fs.writeFile(outFile, content);


        core.setOutput("combined_files", combinedFiles);
        core.setOutput("minimized_files", minimizedFiles);

        core.debug(`Combined ${combinedFiles} file(s) into '${outFile}', minimizing ${minimizedFiles} files.`);

    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

main();