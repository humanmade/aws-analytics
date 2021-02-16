import React, { Fragment } from 'react';
import styled from 'styled-components';
import { getLetter } from '../utils';

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
		width: 0.9rem;
		margin-left: 2px;
	}
`;

const editTitles = ( titles = [], title = '', index = 0 ) => {
	const newTitles = [ ...titles ];
	newTitles[ index ] = title;
	return newTitles;
};

const removeTitle = ( titles, index ) => {
	const newTitles = [ ...titles ];
	newTitles.splice( index, 1 );
	return newTitles;
};

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
							autoFocus={ allTitles.length - 1 === index }
							key={ index }
							label={ `
								${ __( 'Title', 'altis-experiments' ) }
								${ getLetter( index ) }
								${ index === 0 ? __( '(original)', 'altis-experiments' ) : '' }
							` }
							onChange={ value => onChange( editTitles( allTitles, value, index ) ) }
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
							onFocus={ event => {
								const length = event.target.value.length * 2;
								event.target.setSelectionRange( length, length );
							} }
							placeholder={ __( 'Enter another title here.', 'altis-experiments' ) }
							value={ title }
							readOnly={ ! isEditable }
							rows={ 3 }
						/>
						<Info>
							{ variant.size > 0 && (
								<Views>
									<Icon icon="visibility" />
									{ variant.size }
									{ ' ' }
									<span className="screen-reader-text">{ __( 'views', 'altis-experiments' ) }</span>
								</Views>
							) }
							{ ! isEditable && (
								<Preview
									href={ `/?p=${ postId }&set_test=test_titles_${ postId }:${ index }` }
									target="_ab_test_preview"
								>
									{ __( 'Preview', 'altis-experiments' ) }
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
					label={ `${ __( 'Title', 'altis-experiments' ) } ${ getLetter( allTitles.length ) }` }
					onChange={ value => onChange( editTitles( allTitles, value, allTitles.length ) ) }
					placeholder={ __( 'Enter another title here.', 'altis-experiments' ) }
					value=""
					rows={ 3 }
				/>
			) }
		</Fragment>
	);
};

export default TitleTextField;
