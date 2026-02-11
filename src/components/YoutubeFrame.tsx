const YoutubeFrame = ({
  width,
  height,
  url,
}: {
  width: number;
  height: number;
  url: string;
}) => {
  return (
    <iframe
      width={width}
      height={height}
      src={url}
      title=""
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    ></iframe>
  );
};

export default YoutubeFrame;
