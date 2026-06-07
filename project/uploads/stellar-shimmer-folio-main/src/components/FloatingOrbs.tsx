const FloatingOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div
      className="fixed animate-float-1"
      style={{
        width: 700, height: 700,
        top: -100, left: -150,
        background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
        filter: 'blur(80px)',
        willChange: 'transform',
      }}
    />
    <div
      className="fixed animate-float-2"
      style={{
        width: 600, height: 600,
        bottom: -50, right: -100,
        background: 'radial-gradient(circle, rgba(245,158,11,0.09) 0%, transparent 70%)',
        filter: 'blur(80px)',
        willChange: 'transform',
      }}
    />
    <div
      className="fixed animate-float-3"
      style={{
        width: 400, height: 400,
        top: '40%', left: '55%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        willChange: 'transform',
      }}
    />
    <div
      className="fixed animate-float-4"
      style={{
        width: 320, height: 320,
        top: '70%', left: '10%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
        filter: 'blur(70px)',
        willChange: 'transform',
      }}
    />
  </div>
);

export default FloatingOrbs;
