import React from "react";
import PropTypes from "prop-types"; // Import PropTypes
import { base_path } from "../../environment";
const ImageWithBasePath = (props) => {
  const cleanBasePath = base_path.endsWith('/') ? base_path.slice(0, -1) : base_path;
  const cleanSrc = props.src.startsWith('/') ? props.src : `/${props.src}`;
  const fullSrc = `${cleanBasePath}${cleanSrc}`;
  return (
    <img
      className={props.className}
      src={fullSrc}
      height={props.height}
      alt={props.alt}
      width={props.width}
      id={props.id}
    />
  );
};

// Add PropTypes validation
ImageWithBasePath.propTypes = {
  className: PropTypes.string,
  src: PropTypes.string.isRequired, // Make 'src' required
  alt: PropTypes.string,
  height: PropTypes.number,
  width: PropTypes.number,
  id: PropTypes.string,
};

export default ImageWithBasePath;
