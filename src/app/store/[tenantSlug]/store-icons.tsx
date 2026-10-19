type IconProps = { size?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false });

export const HomeIcon = ({ size = 24 }: IconProps) => <svg {...base(size)}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>;
export const GridIcon = ({ size = 24 }: IconProps) => <svg {...base(size)}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>;
export const HeartIcon = ({ size = 24, filled = false }: IconProps & { filled?: boolean }) => <svg {...base(size)} fill={filled ? "currentColor" : "none"}><path d="M12 20.5s-8-4.7-8-10.6A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.9c0 5.9-8 10.6-8 10.6z" /></svg>;
export const UserIcon = ({ size = 24 }: IconProps) => <svg {...base(size)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>;
export const CartIcon = ({ size = 24 }: IconProps) => <svg {...base(size)}><path d="M3 4h2.5l2.2 11h9.8l2-8H6.4" /><circle cx="9.5" cy="19.5" r="1.5" /><circle cx="17" cy="19.5" r="1.5" /></svg>;
export const SearchIcon = ({ size = 22 }: IconProps) => <svg {...base(size)}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>;
export const BackIcon = ({ size = 24 }: IconProps) => <svg {...base(size)}><path d="M15 5l-7 7 7 7" /></svg>;
export const CloseIcon = ({ size = 24 }: IconProps) => <svg {...base(size)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const TrashIcon = ({ size = 20 }: IconProps) => <svg {...base(size)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const PlusIcon = ({ size = 18 }: IconProps) => <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>;
export const MinusIcon = ({ size = 18 }: IconProps) => <svg {...base(size)}><path d="M5 12h14" /></svg>;
export const ChevronIcon = ({ size = 18 }: IconProps) => <svg {...base(size)}><path d="M9 5l7 7-7 7" /></svg>;
export const PhoneIcon = ({ size = 20 }: IconProps) => <svg {...base(size)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
export const WhatsappIcon = ({ size = 24 }: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.700 6.700 0 0 1-3.300-2.900c-.2-.4.2-.4.700-1.300.1-.2 0-.3 0-.5l-.8-1.800c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.200c0 1.300.9 2.600 1 2.800.1.200 1.800 2.800 4.500 3.900 1.700.7 2.300.7 3.100.6.500-.1 1.500-.6 1.700-1.200.2-.6.2-1.100.2-1.200-.1-.2-.3-.2-.5-.3z" /></svg>;
export const BagIcon = ({ size = 24 }: IconProps) => <svg {...base(size)}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
