/**
 * Знак «Салфетки»: айсберг из сложенной бумажной салфетки (растровый оригинал из бренд-листа).
 * Фон у картинки белый — светлая бумага айсберга неотличима от фона, прозрачность её портит.
 * Поэтому в тёмной теме знак стоит на белой скруглённой плашке, как вариант «иконка приложения».
 * size — высота знака в пикселях.
 */
export function Logo({ size = 60 }: { size?: number }) {
  const src = size > 100 ? "/brand/logo.png" : "/brand/logo-200.png";
  return (
    <span className="brand-mark" style={{ height: size }}>
      <img src={src} alt="" height={size} draggable={false} />
    </span>
  );
}
