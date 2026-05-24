type AppTopbarProps = {
  businessName: string;
  periodLabel: string;
  isMobile?: boolean;
  onOpenSidebar?: () => void;
};

export function AppTopbar({
  businessName,
  periodLabel,
  isMobile = false,
  onOpenSidebar,
}: AppTopbarProps) {
  void businessName;
  void periodLabel;
  void isMobile;
  void onOpenSidebar;

  return null;
}