// src/components/Input.tsx
import React from "react";
import clsx from "clsx";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

const Input: React.FC<Props> = ({ label, error, className, ...rest }) => {
    return (
        <div className={clsx("flex flex-col", className)}>
            {label && <label className="mb-1 text-sm font-medium">{label}</label>}
            <input
                {...rest}
                className={clsx(
                    "px-3 py-2 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition",
                    error && "border-red-500"
                )}
            />
            {error && <span className="text-red-400 text-sm mt-1">{error}</span>}
        </div>
    );
};

export default Input;
