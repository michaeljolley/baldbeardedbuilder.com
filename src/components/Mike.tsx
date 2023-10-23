export default function () {
  const imageNumber = Math.floor(Math.random() * (14 - 1) + 1);

  return (
    <img
      style="width:100%;mix-blend-mode:overlay;"
      src={`https://res.cloudinary.com/dk3rdh3yo/image/upload/f_auto/v1607302424/mj_${imageNumber}.png`}
      alt="Image of Michael making an odd face/pose."
    />
  );
}
