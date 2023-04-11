declare module "lua-format" {
    export interface Settings {
        RenameVariables?: boolean;
        RenameGlobals?: boolean;
        SolveMath?: boolean;
    }

    export function Beautify(code: string, options: Settings): string
    export function Minify(code: string, options: Settings): string
    export function Uglify(code: string, options: Settings): string
}

