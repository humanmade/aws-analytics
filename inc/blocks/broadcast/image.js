import React, { useState } from 'react';
import ContentLoader from 'react-content-loader';

const loaderProps = {
	speed: 2,
	foregroundColor: '#f5f6f8',
	backgroundColor: '#fff',
};

/**
 * Image component, with loading state management.
 *
 * @param {object} props Component props
 * @returns {ReactElement} Edit block component.
 */
export default function Image( props ) {
	const [ isLoaded, setIsLoaded ] = useState( false );
	return (
		<>
			<ContentLoader
				{ ...loaderProps }
				height={ props.height }
				style={ { display: isLoaded ? 'none' : 'block' } }
				width={ props.width }
			>
				<rect height={ props.height } rx="5" ry="5" width={ props.width } x={ 0 } y={ 0 } />
			</ContentLoader>
			<img
				alt=""
				style={ {
					display: 'block',
					position: isLoaded ? 'static' : 'absolute',
					visibility: isLoaded ? 'visible' : 'hidden',
				} }
				{ ...props }
				onLoad={ () => {
					setIsLoaded( true );
				} }
			/>
		</>
	);
}
