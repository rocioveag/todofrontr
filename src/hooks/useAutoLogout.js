import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const TIMEOUT = 10000; // 10 segundos
export const useAutoLogout = (logout) => {
  const navigate = useNavigate();
  const timer = useRef(null);

  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      logout(); 
      navigate("/login");
    }, TIMEOUT);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];

    events.forEach(event =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer(); 

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(event =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, []);
};