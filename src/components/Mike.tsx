import "./Mike.css";

export default function () {
  const imageNumber = Math.floor(Math.random() * (14 - 1) + 1);

  return (
    <picture>
      <source
        media="(max-width:640px)"
        style="height:450px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/h_300,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <source
        media="(max-width:768px)"
        style="height:180px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/h_180x,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <source
        media="(max-width:1024px)"
        style="height:237px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/h_237,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <source
        media="(max-width:1280px)"
        style="height:309px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/h_309,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <source
        media="(max-width:1536px)"
        style="height:397px;"
        srcset={`https://res.cloudinary.com/dk3rdh3yo/image/upload/h_397,f_auto/v1607302424/mj_${imageNumber}.png`}
      />
      <img
        src={`https://res.cloudinary.com/dk3rdh3yo/image/upload/f_auto/v1607302424/mj_${imageNumber}.png`}
        alt="Image of Michael making an odd face/pose."
        style="width:100%;"
      />
    </picture>
  );
}
