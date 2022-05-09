import React from 'react';
import styled from 'styled-components';

const {
	MediaPlaceholder,
} = wp.blockEditor;
const {
	withNotices,
} = wp.components;
const { useSelect } = wp.data;
const { __ } = wp.i18n;

const ImageSelectInputContainer = styled.div`
	.block-editor-media-placeholder {
		padding: 0;
		margin: 0;
		min-height: 0;
		outline: none;
		border: none;
		box-shadow: none;
	}

	.components-placeholder .components-placeholder__fieldset {
		flex-direction: row;
	}
`;

/**
 * Image input components
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Image input field component.
 */
const ImageInput = props => {
	const {
		noticeUI,
		noticeOperations,
		value,
		onChange,
		isEditable,
	} = props;

	const media = useSelect(
		select =>
			value && select( 'core' ).getMedia( value ),
		[ value ]
	);

	return (
		<ImageSelectInputContainer>
			{ ( isEditable ) && (
				<MediaPlaceholder
					accept="image/*"
					allowedTypes={ [ 'image' ] }
					labels={ {
						title: null,
						instructions: __( 'Upload a media file or pick one from your media library.', 'altis-analytics' ),
					} }
					notices={ noticeUI }
					value={ media || {} }
					onError={ message => [
						noticeOperations.removeAllNotices(),
						noticeOperations.createErrorNotice( message ),
					] }
					onSelect={ attachment => onChange( attachment.id ) }
				/>
			) }
			{ media && (
				<img
					alt={ media.alt_text || __( 'Featured image', 'altis-analytics' ) }
					src={ media.source_url }
				/>
			) }
		</ImageSelectInputContainer>
	);
};

export default withNotices( ImageInput );
