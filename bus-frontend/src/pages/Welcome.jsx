import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./welcome.css";

const welcomePlaceholder = "data:image/jpeg;base64,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";

function Welcome() {
  const buttonRef = useRef(null);
  const frameRef = useRef(null);
  const [imagePhase, setImagePhase] = useState("loading");

  useEffect(() => () => window.cancelAnimationFrame(frameRef.current), []);

  const moveButton = (event) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const button = buttonRef.current;
    const bounds = button.getBoundingClientRect();
    const x = (event.clientX - (bounds.left + bounds.width / 2)) * 0.12;
    const y = (event.clientY - (bounds.top + bounds.height / 2)) * 0.16;

    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      button.style.setProperty("--welcome-button-x", `${x}px`);
      button.style.setProperty("--welcome-button-y", `${y}px`);
    });
  };

  const resetButton = () => {
    window.cancelAnimationFrame(frameRef.current);
    const button = buttonRef.current;
    button.style.setProperty("--welcome-button-x", "0px");
    button.style.setProperty("--welcome-button-y", "0px");
  };

  const revealImage = async (event) => {
    const image = event.currentTarget;

    try {
      await image.decode();
    } catch {
      // The load event already confirms the image is available for display.
    }

    setImagePhase(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "revealing" : "covering",
    );
  };

  const beginFocusTransition = (event) => {
    if (event.propertyName === "opacity" && imagePhase === "covering") {
      setImagePhase("revealing");
    }
  };

  return (
    <main className="welcome-page" data-image-phase={imagePhase} aria-label="BusTracker">
      <img
        className="welcome-background welcome-background-placeholder"
        src={welcomePlaceholder}
        alt=""
        aria-hidden="true"
      />
      <img
        className="welcome-background welcome-background-full"
        src="/welcome-school-bus.png"
        alt="Children arriving at school with yellow school buses"
        decoding="async"
        fetchPriority="high"
        onLoad={revealImage}
        onTransitionEnd={beginFocusTransition}
      />
      <div className="welcome-shade" aria-hidden="true" />
      <Link
        ref={buttonRef}
        className="welcome-signin"
        to="/choose-role"
        onPointerMove={moveButton}
        onPointerLeave={resetButton}
        onBlur={resetButton}
      >
        Sign In
      </Link>
    </main>
  );
}

export default Welcome;
