import React, { Fragment } from 'react';
import styled from 'styled-components';

import { getLetter } from '../../utils';

const {
	Button,
	TextareaControl,
	Icon,
} = wp.components;
const { __ } = wp.i18n;

const Variant = styled.div`
	margin-bottom: 5px;
	position: relative;
`;

const Info = styled.div`
	font-size: 85%;
	color: #666;
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
`;

const Views = styled.div`
	flex: 1;

	.dashicon {
		margin-right: 4px;
		vertical-align: middle;
		position: relative;
		width: 0.9rem;
		top: -1px;
	}
`;

const Preview = styled( Button ).attrs( {
	isLink: true,
} )`
	text-align: right;
	flex: 0;
	align-self: flex-end;
	font-size: inherit;

	.dashicon {
		width: auto;
		font-size: inherit;
		line-height: inherit;
		vertical-align: baseline;
	}

	svg.dashicon, .dashicon svg {
		width: 0.9rem;
		margin-left: 2px;
	}
`;

/**
 * Updates a title in the array of titles.
 *
 * @param {Array} titles List of titles to test.
 * @param {string} title The updated title string.
 * @param {number} index The array index of the title to update.
 * @returns {Array} The updated titles array.
 */
const editTitles = ( titles = [], title = '', index = 0 ) => {
	const newTitles = [ ...titles ];
	newTitles[ index ] = title;
	return newTitles;
};

/**
 * Remove a title from an array of titles.
 *
 * @param {Array} titles The list of titles.
 * @param {number} index The index of the title to remove.
 * @returns {Array} The updated array of titles.
 */
const removeTitle = ( titles, index ) => {
	const newTitles = [ ...titles ];
	newTitles.splice( index, 1 );
	return newTitles;
};

/**
 * Title field component.
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Title text field component.
 */
const TitleTextField = props => {
	const {
		defaultTitle,
		isEditable,
		onChange,
		postId,
		titles,
		variants,
	} = props;

	// Use the current post title if we have no titles yet.
	const allTitles = titles.length > 0 ? titles : [ defaultTitle ];

	return (
		<Fragment>
			{ allTitles.map( ( title, index ) => {
				// Get variant data.
				const variant = ( variants && variants[ index ] ) || { size: 0 };

				return (
					<Variant key={ index }>
						<TextareaControl
							key={ index }
							autoFocus={ allTitles.length - 1 === index }
							label={ `
								${ __( 'Title', 'altis-analytics' ) }
								${ getLetter( index ) }
								${ index === 0 ? __( '(original)', 'altis-analytics' ) : '' }
							` }
							placeholder={ __( 'Enter another title here.', 'altis-analytics' ) }
							readOnly={ ! isEditable }
							rows={ 3 }
							value={ title }
							onChange={ value => onChange( editTitles( allTitles, value, index ) ) }
							onFocus={ event => {
								const length = event.target.value.length * 2;
								event.target.setSelectionRange( length, length );
							} }
							onKeyUp={ event => {
								if (
									title === '' &&
									event.target.value === '' &&
									(
										( event.key && event.key === 'Backspace' ) ||
										( event.which && event.which === 8 )
									)
								) {
									onChange( removeTitle( allTitles, index ) );
								}
							} }
						/>
						<Info>
							{ variant.size > 0 && (
								<Views>
									<Icon icon="visibility" />
									{ variant.size }
									{ ' ' }
									<span className="screen-reader-text">{ __( 'views', 'altis-analytics' ) }</span>
								</Views>
							) }
							{ ! isEditable && (
								<Preview
									href={ `/?p=${ postId }&set_test=test_titles_${ postId }:${ index }` }
									target="_ab_test_preview"
								>
									{ __( 'Preview', 'altis-analytics' ) }
									<Icon icon="external" />
								</Preview>
							) }
						</Info>
					</Variant>
				);
			} ) }
			{ isEditable && allTitles.length < 26 && (
				<TextareaControl
					autoFocus={ allTitles.length <= 1 }
					label={ `${ __( 'Title', 'altis-analytics' ) } ${ getLetter( allTitles.length ) }` }
					placeholder={ __( 'Enter another title here.', 'altis-analytics' ) }
					rows={ 3 }
					value=""
					onChange={ value => onChange( editTitles( allTitles, value, allTitles.length ) ) }
				/>
			) }
		</Fragment>
	);
};

export default TitleTextField;
