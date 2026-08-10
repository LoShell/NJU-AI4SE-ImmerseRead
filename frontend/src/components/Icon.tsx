type IconName =
  | "book"
  | "chevron"
  | "message"
  | "music"
  | "note"
  | "pause"
  | "play"
  | "settings"
  | "trash"
  | "upload";

export interface IconProps {
  name: IconName;
}

const paths: Record<IconName, string[]> = {
  book: ["M4 5.5c2.2-1 4.4-1 6.5.2v13c-2.1-1.1-4.3-1.2-6.5-.2V5.5Z", "M20 5.5c-2.2-1-4.4-1-6.5.2v13c2.1-1.1 4.3-1.2 6.5-.2V5.5Z"],
  chevron: ["m8 10 4 4 4-4"],
  message: ["M5 6.5h14v9H9l-4 3v-12Z"],
  music: ["M9 18V6l9-2v11", "M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z", "M18 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"],
  note: ["M6 4h9l3 3v13H6V4Z", "M14 4v4h4", "M9 12h6", "M9 16h4"],
  pause: ["M8 6v12", "M16 6v12"],
  play: ["M8 5v14l11-7-11-7Z"],
  settings: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M4 12h2", "M18 12h2", "M12 4v2", "M12 18v2"],
  trash: ["M5 7h14", "M9 7V5h6v2", "M8 10v8", "M16 10v8", "M7 7l1 13h8l1-13"],
  upload: ["M12 16V5", "M8 9l4-4 4 4", "M5 18h14"]
};

export function Icon({ name }: IconProps) {
  return (
    <svg aria-hidden="true" className="icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {paths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}
