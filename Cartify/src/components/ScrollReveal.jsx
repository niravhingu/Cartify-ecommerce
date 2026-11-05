import { useEffect, useRef, useState } from "react";

function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 700,
  direction = "up",
  once = false,
}) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold: 0.15,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [once]);

  const directionStyles = {
    up: "translate-y-12",
    down: "-translate-y-12",
    left: "translate-x-12",
    right: "-translate-x-12",
    zoom: "scale-90",
  };

  return (
    <div
      ref={elementRef}
      className={`
        ${className}
        transform
        transition-all
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${
          isVisible
            ? "translate-x-0 translate-y-0 scale-100 opacity-100"
            : `${directionStyles[direction]} opacity-0`
        }
      `}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${isVisible ? delay : 0}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default ScrollReveal;