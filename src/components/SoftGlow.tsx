/**
 * Light-mode hero backdrop: static CSS radial gradients, no WebGL. Replaces
 * AuraBackground on the landing page — a dark animated shader doesn't fit a
 * white Proton-style layout, and dropping it removes the GPU cost entirely
 * (this was the thing making /inbox laggy before it got scoped out of there).
 */
export default function SoftGlow() {
  return (
    <div
      className="absolute top-0 left-0 w-full h-[900px] -z-10 overflow-hidden pointer-events-none"
      style={{
        maskImage: "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
      }}
    >
      <div
        className="absolute left-1/2 top-[-200px] -translate-x-1/2 w-[1200px] h-[900px]"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(34,197,94,0.16), transparent 60%)",
        }}
      />
      <div
        className="absolute left-[10%] top-[100px] w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(74,222,128,0.12), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute right-[8%] top-[250px] w-[420px] h-[420px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(134,239,172,0.14), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
