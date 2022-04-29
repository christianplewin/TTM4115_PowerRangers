import {forwardRef} from 'react';

/* React component for a videostream. */
const VideoStream = forwardRef((props, ref) => {
	return (
		<>
			<video
				ref={ref}
				id={props.props.location}
				className="videostream"
				autoPlay
				playsInline
				muted={props.props.muted}
			/>
		</>
	);
});

export default VideoStream;