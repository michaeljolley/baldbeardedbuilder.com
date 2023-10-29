import "./Mike.css";

export default function () {
  const imageNumber = Math.floor(Math.random() * (14 - 1) + 1);

  return (
    <picture>
      <source
        media="(max-width:640px)"
        style="width:450px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/w_450,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <source
        media="(max-width:768px)"
        style="width:270px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/w_270,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <source
        media="(max-width:1024px)"
        style="width:355px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/w_355,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <source
        media="(max-width:1280px)"
        style="width:464px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/w_464,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <source
        media="(max-width:1536px)"
        style="width:596px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/w_596,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <img
        src={`https://res.cloudinary.com/dk3rdh3yo/image/upload/f_auto/v1607302424/mj_${imageNumber}.png`}
        alt="Image of Michael making an odd face/pose."
        style="width:100%;"
      />
    </picture>
  );
}
