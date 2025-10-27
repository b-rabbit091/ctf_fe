import React, { forwardRef } from "react";
import { motion, MotionProps } from "framer-motion";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger";
} & MotionProps;

const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    ghost: "bg-transparent border border-gray-600 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
};

const Button = forwardRef<HTMLButtonElement, Props>(
    ({ children, variant = "primary", className, ...rest }, ref) => (
        <motion.button
            ref={ref}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            className={clsx(
                "px-4 py-2 rounded-md font-semibold shadow-sm",
                variants[variant],
                className
            )}
            {...rest}
        >
            {children}
        </motion.button>
    )
);

Button.displayName = "Button";

export default Button;
