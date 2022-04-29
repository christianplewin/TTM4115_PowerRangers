import {forwardRef} from 'react';

const VideoStream = forwardRef((props, ref) => {
	return (
		<>
			<video
				ref={ref}
				id={props.location}
				className="videostream"
				autoPlay
				playsInline
			/>
		</>
	);
});

export default VideoStream;