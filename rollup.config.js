import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";

export default [
  {
    input: "./src/index.ts",
    output: {
      file: "./build/index.esm.js",
      format: "es",
      sourcemap: true,
    },
    plugins: [
      resolve({ extensions: [".ts"], modulesOnly: true }),
      babel({
        babelrc: false,
        configFile: false,
        targets: "defaults and not IE 11",
        presets: [
          ["@babel/preset-env", { targets: "defaults and not IE 11" }],
          "@babel/preset-typescript",
        ],
        babelHelpers: "bundled",
        extensions: [".ts"],
      }),
    ],
  },
  {
    input: "./src/index.ts",
    output: {
      file: "./build/index.cjs.js",
      format: "cjs",
      sourcemap: true,
      exports: "auto",
    },
    plugins: [
      resolve({ extensions: [".ts"], modulesOnly: true }),
      babel({
        babelrc: false,
        configFile: false,
        targets: "node 12",
        presets: [
          ["@babel/preset-env", { targets: "node 12" }],
          "@babel/preset-typescript",
        ],
        babelHelpers: "bundled",
        extensions: [".ts"],
      }),
    ],
  },
  {
    input: "./src/index.umd.ts",
    output: {
      file: "./build/index.js",
      format: "umd",
      name: "limit-concurrency",
      sourcemap: true,
    },
    plugins: [
      resolve({ extensions: [".ts"] }),
      babel({
        babelrc: false,
        configFile: false,
        targets: "defaults and IE 11",
        presets: [
          ["@babel/preset-env", { targets: "defaults and IE 11" }],
          "@babel/preset-typescript",
        ],
        babelHelpers: "bundled",
        extensions: [".ts"],
      }),
    ],
  },
];
