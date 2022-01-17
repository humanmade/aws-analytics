import { Tooltip } from '@wordpress/components';
import React from 'react';

import './BreakdownList.css';

export interface Item {
	title: string,
	value: number,
	[ k: string ]: any,
}

type ItemProps = Item & {
	total: number,
	showPercent: boolean,
	onSelect?(): void,
};

const formatPercentage = ( value: number ) => ( value < 1 ? '<1' : Math.round( value ) ) + '%';

function Item( props: ItemProps ) {
	const percentage = props.value / props.total * 100;
	return (
		<li
			className="BreakdownList__item"
			role="row"
			style={ {
				// @ts-ignore
				'--breakdownlist-item-width': `${ Math.floor( percentage ) }%`,
			} }
		>
			<Tooltip text={ props.title }>
				{ props.onSelect ? (
					<button
						className="BreakdownList__item-title BreakdownList__item-select"
						role="rowheader"
						type="button"
						onClick={ props.onSelect }
					>
						{ props.title }
					</button>
				) : (
					<span
						className="BreakdownList__item-title"
						role="rowheader"
					>
						{ props.title }
					</span>
				) }
			</Tooltip>
			<span className="BreakdownList__item-value" role="cell">
				{ props.value }
				{ props.showPercent && (
					<>
						{ ' ' }
						({ formatPercentage( percentage ) })
					</>
				) }
			</span>
		</li>
	);
}

export interface Props {
	header?: {
		title: string,
		value: string | number,
	},
	maxItems?: number,
	items: Item[],
	showPercent?: boolean,
	total?: number,
	onSelectItem?( item: Item ): void,
}

export default function BreakdownList( props: Props ) {
	const total = props.total || props.items.reduce( ( total, item ) => total + item.value, 0 );
	const items = props.maxItems ? props.items.slice( 0, props.maxItems ) : props.items;
	return (
		<ol
			className="BreakdownList"
			role="table"
		>
			{ props.header && (
				<li
					className="BreakdownList__header"
					role="rowgroup"
				>
					<span className="BreakdownList__item-title" role="columnheader">{ props.header.title }</span>
					<span className="BreakdownList__item-value" role="columnheader">{ props.header.value }</span>
				</li>
			) }
			{ items.map( item => (
				<Item
					key={ item.title }
					showPercent={ typeof props.showPercent !== 'undefined' ? props.showPercent : true }
					title={ item.title }
					total={ total }
					value={ item.value }
					onSelect={ props.onSelectItem ? () => props.onSelectItem!( item ) : undefined }
				/>
			) ) }
		</ol>
	)
}
