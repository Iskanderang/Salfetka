/**
 * Знак «Салфетки»: айсберг из сложенной бумажной салфетки (растровый оригинал из бренд-листа).
 * Две версии: светлая — на белом фоне, тёмная — с прозрачным фоном и штриховкой под тёмную тему.
 * Какую показать, решает CSS по data-theme, поэтому смена темы не перерисовывает компонент.
 * size — высота знака в пикселях.
 */
export function Logo({ size = 60 }: { size?: number }) {
  const big = size > 100;
  return (
    <span className="brand-mark" style={{ height: size }}>
      <img className="brand-light" src={big ? "/brand/logo.png" : "/brand/logo-200.png"} alt="" height={size} draggable={false} />
      <img className="brand-dark" src={big ? "/brand/logo-dark.png" : "/brand/logo-dark-200.png"} alt="" height={size} draggable={false} />
    </span>
  );
}
