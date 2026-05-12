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

export function LinkIconGlyph({ name, className }: { name: string; className?: string }) {
  const iconClassName = className ?? "size-4";

  switch (name) {
    case "globe":
      return <Globe className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "calendar":
      return <Calendar className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "mail":
      return <Mail className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "phone":
      return <Phone className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "map-pin":
      return <MapPin className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "instagram":
    case "camera":
      return <Camera className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "youtube":
      return <Play className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "github":
      return <Code className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "linkedin":
    case "briefcase":
      return <Briefcase className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "music":
      return <Music className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "shop":
      return <ShoppingBag className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "user":
      return <User className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "star":
      return <Star className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "heart":
      return <Heart className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "video":
      return <Video className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "message":
      return <MessageCircle className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "payment":
      return <CreditCard className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "file":
      return <FileText className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "download":
      return <Download className={iconClassName} aria-hidden strokeWidth={2.1} />;
    case "external":
      return <ExternalLink className={iconClassName} aria-hidden strokeWidth={2.1} />;
    default:
      return <Link className={iconClassName} aria-hidden strokeWidth={2.1} />;
  }
}
