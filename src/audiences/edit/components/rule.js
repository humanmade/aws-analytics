import styled from 'styled-components';

const Rule = styled.div.attrs( () => ( {
	className: "audience-editor__rule",
} ) )`
	margin: 0 0 15px;
	display: flex;

	select {
		flex: 1;
		margin-right: 5px;
	}

	.audience-editor__rule-operator {
		flex 0;
	}
`;

export default Rule;
