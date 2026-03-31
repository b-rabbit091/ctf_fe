import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

export default defineConfig({
    plugins: [react()],
    base: "/ctf/",
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules")) {
                        return undefined;
                    }

                    if (id.includes("react-quill") || id.includes("/quill/")) {
                        return "editor";
                    }

                    if (
                        id.includes("react-router") ||
                        id.includes("@remix-run/router")
                    ) {
                        return "router";
                    }

                    if (
                        id.includes("react-toastify") ||
                        id.includes("react-icons") ||
                        id.includes("framer-motion")
                    ) {
                        return "ui-vendor";
                    }

                    if (
                        id.includes("/react/") ||
                        id.includes("/react-dom/") ||
                        id.includes("jwt-decode")
                    ) {
                        return "react-vendor";
                    }

                    return "vendor";
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./src/test/setup.ts",
    },
});
