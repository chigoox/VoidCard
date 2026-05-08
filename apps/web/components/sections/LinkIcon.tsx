import {
  Briefcase,
  Calendar,
  Camera,
  Code,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Heart,
  Link,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Phone,
  Play,
  ShoppingBag,
  Star,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";

export const LINK_ICON_OPTIONS = [
  { id: "link", label: "Link", Icon: Link },
  { id: "globe", label: "Website", Icon: Globe },
  { id: "calendar", label: "Book", Icon: Calendar },
  { id: "mail", label: "Email", Icon: Mail },
  { id: "phone", label: "Phone", Icon: Phone },
  { id: "map-pin", label: "Location", Icon: MapPin },
  { id: "instagram", label: "Instagram", Icon: Camera },
  { id: "youtube", label: "YouTube", Icon: Play },
  { id: "github", label: "GitHub", Icon: Code },
  { id: "linkedin", label: "LinkedIn", Icon: Briefcase },
  { id: "music", label: "Music", Icon: Music },
  { id: "shop", label: "Shop", Icon: ShoppingBag },
  { id: "briefcase", label: "Work", Icon: Briefcase },
  { id: "user", label: "Person", Icon: User },
  { id: "star", label: "Featured", Icon: Star },
  { id: "heart", label: "Favorite", Icon: Heart },
  { id: "camera", label: "Photo", Icon: Camera },
  { id: "video", label: "Video", Icon: Video },
  { id: "message", label: "Message", Icon: MessageCircle },
  { id: "payment", label: "Pay", Icon: CreditCard },
  { id: "file", label: "File", Icon: FileText },
  { id: "download", label: "Download", Icon: Download },
  { id: "external", label: "External", Icon: ExternalLink },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon }[];

export type LinkIconName = (typeof LINK_ICON_OPTIONS)[number]["id"];

const ICONS = new Map<string, LucideIcon>(LINK_ICON_OPTIONS.map((option) => [option.id, option.Icon]));

export function LinkIconGlyph({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS.get(name) ?? Link;
  return <Icon className={className ?? "size-4"} aria-hidden strokeWidth={2.1} />;
}
