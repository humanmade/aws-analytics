import React from 'react';
import { __ } from '@wordpress/i18n';

type Props = {
	url: string,
	location: string,
	linkText: string,
};

export default function Link( props: Props ) {
	return (
		<a
			href={ props.url }
			onClick={ () => {
				analytics.track(
					'click',
					{
						location: props.location,
						url: props.url,
						link_text: props.linkText,
					}
				);
			}}
		>
			{ props.linkText }
		</a>
	)
}
