"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInterval = useInterval;
const react_1 = require("react");
function useInterval(interval, callback) {
    // Store value directly in state to guarantee re-renders
    const [value, setValue] = (0, react_1.useState)(undefined);
    const callbackRef = (0, react_1.useRef)(callback);
    // Always keep the latest callback without retriggering the interval effect
    (0, react_1.useEffect)(() => {
        callbackRef.current = callback;
    }, [callback]);
    (0, react_1.useEffect)(() => {
        // Initial calculation
        setValue(callbackRef.current());
        // Setup interval
        const intervalId = setInterval(() => {
            setValue(callbackRef.current());
        }, interval);
        // Cleanup on unmount or when interval changes
        return () => clearInterval(intervalId);
    }, [interval]);
    return value;
}
