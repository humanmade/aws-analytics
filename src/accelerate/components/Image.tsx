import React, { useState } from 'react';
import ContentLoader from 'react-content-loader';

type Props = {
	alt?: string,
	className?: string,
	src: string,
	width?: number,
	height?: number,
};

const loaderProps = {
	speed: 2,
	foregroundColor: "#f5f6f8",
	backgroundColor: "#fff",
};

export default function Image( props: Props ) {
	const [ isLoaded, setIsLoaded ] = useState( false );
	return (
		<>
			<ContentLoader
				{ ...loaderProps }
				style={ { display: isLoaded ? 'none' : 'block' } }
				width={ props.width }
				height={ props.height }
			>
				<rect x={0} y={0} rx="5" ry="5" width={ props.width } height={ props.height } />
			</ContentLoader>
			<img
				onLoad={ () => {
					setIsLoaded( true );
				} }
				style={ {
					display: 'block',
					position: isLoaded ? 'static' : 'absolute',
					visibility: isLoaded ? 'visible' : 'hidden',
				} }
				{ ...props }
			/>
		</>
	);
};
