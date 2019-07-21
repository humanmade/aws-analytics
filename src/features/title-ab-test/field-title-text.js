import React, { Fragment } from 'react';
import styled from 'styled-components';

const { TextControl } = wp.components;
const { withSelect, withDispatch } = wp.data;
const { compose } = wp.compose;
const { __ } = wp.i18n;

const Variant = styled.div`
margin-bottom: 5px;
position: relative;
`;

const PercentageChange = styled.div`
position: absolute;
top: 0;
right: 0;
font-size: 90%;
`;

export const TitleTextField = props => {
	const { goal, titles, setTitles } = props;

	const variants = new Array(titles.length + 1)
		.fill({ rate: 0.0 })
		.map((variant, id) => Object.assign({}, variant, (goal && goal.variants && goal.variants[id]) || {}));
	const control = variants[0];

	return (
		<Fragment>
			{titles.map((title, index) => {
				// Get variant data.
				const variantId = index + 1;
				const variant = variants[variantId];
				const change = (variant.rate - control.rate) * 100;

				return (
					<Variant key={index}>
						<TextControl
							autoFocus={titles.length - 1 === index}
							key={index}
							label={`${__('Title ')} ${index + 1}`}
							onChange={value => setTitles(titles, value, index)}
							placeholder={__('Enter your title here.')}
							value={title}
						/>
						<PercentageChange>
							{`${change >= 0 ? '+' : ''}${change.toFixed(2)}`}%
						</PercentageChange>
					</Variant>
				)
			})}
			<TextControl
				label={__('New title')}
				onChange={value => setTitles(titles, value, titles.length)}
				placeholder={__('Enter your title here.')}
				value=""
			/>
		</Fragment>
	);
};

export const TitleTextFieldWithData = compose(
	withSelect(select => {
		return {
			titles: select('core/editor').getEditedPostAttribute('alternative_titles') || [],
			goal: select('core/editor').getCurrentPostAttribute('_hm_analytics_test_titles_goal') || {},
		};
	}),
	withDispatch(dispatch => {
		return {
			setTitles: (titles = [], title = '', index = 0) => {
				const newTitles = titles.slice();
				newTitles[index] = title;
				dispatch('core/editor').editPost({
					alternative_titles: newTitles
				} );
			}
		};
	})
)(TitleTextField);

export default TitleTextFieldWithData;
