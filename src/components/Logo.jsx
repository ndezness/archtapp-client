export default function Logo({ size = 32, tile = false }) {
  return (
    <img
      className={tile ? "logo logo-tile" : "logo"}
      src="/logo-mark.png"
      width={size}
      height={size}
      alt="ArchtApp logo"
    />
  );
}