type UserAvatarProps = {
  avatarUrl?: string | null;
  name: string;
  sizeClassName?: string;
  borderClassName?: string;
  className?: string;
};

export default function UserAvatar({
  avatarUrl,
  name,
  sizeClassName = "h-9 w-9 sm:h-10 sm:w-10",
  borderClassName = "border-2 border-white dark:border-[#dbe6f2]",
  className = "",
}: UserAvatarProps) {
  const base = `overflow-hidden rounded-full shadow-sm ${borderClassName} ${sizeClassName} ${className}`;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`${name} avatar`}
        className={`${base} object-cover`}
        src={avatarUrl}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`${base} flex items-center justify-center bg-[#7FB8FF]/15 text-sm font-semibold text-[#2f4f86] dark:bg-[#7FB8FF]/20`}
    >
      {initial}
    </div>
  );
}
