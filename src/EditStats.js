/*jslint browser: true, white: true, plusplus: true, todo: true */
/**
 * Edit statistics
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/EditStats.js]] ([[File:User:Helder.wiki/Tools/EditStats.js]])
 * TODO:
 * - Contar tanto reversões como edições normais
 * - Gerar uma única tabela, com cada período em uma coluna
 * - Incluir botões para preencher campos com listas obtidas da API
 * - Facilitar a seleção de datas com o plugin "datepicker" do jQuery
 */
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';

$.extend( mw.Api.prototype, {
	/**
	 * Get list of users in the given group
	 */
	getUsersInGroup: function( group ){
		var apiDeferred = $.Deferred();
		this.get( {
			list: 'allusers',
			augroup: group,
			aulimit: 5000
		} )
		.done( function ( data ) {
			apiDeferred.resolve(
				$.map(data.query.allusers, function(user){
					return user.name;
				})
			);
		} )
		.fail( apiDeferred.reject );
		return apiDeferred.promise();
	},
	/**
	 * Get number of reverts made by a user in a given period of time
	 */
	getTotalRevertsByUser: function( userName, from, to ){
		var	apiDeferred = $.Deferred(),
			mwAPI = this,
			params = {
				list: 'usercontribs',
				ucstart: from,
				ucend: to,
				ucuser: userName,
				ucdir: 'newer',
				ucprop: 'comment',
				uclimit: 5000
			},
			total = 0,
			doRequest = function( ucstart ){
				if( ucstart ){
					params.ucstart = ucstart;
				}
				mwAPI.get( params )
				.done( function ( data ) {
					var	i, l,
						list = data.query.usercontribs;
					for(i=0, l = list.length; i < l; i++ ){
						if( /Rever(?:tendo|tidas|são)|Desf(?:eita|iz)/gi.test( list[i].comment ) ){
							total += 1;
						}
					}
					if( data['query-continue']){
						doRequest( data['query-continue'].usercontribs.ucstart );
					} else {
						apiDeferred.resolve( total );
					}
				} )
				.fail( apiDeferred.reject );
			};
		doRequest();
		return apiDeferred.promise();
	}
});

var api = new mw.Api(),
getRevertStats = function( userList, from, to ){
	var	statsDeferred = $.Deferred(),
		index = 0,
		table = [],
		wikitable = '{| class="wikitable sortable" style="float:left;"\n|+ De ' +
			from + ' a ' + to + '\n|-\n! Editor || Total\n',
		addUserRevertsToTable = function( userName ){
			mw.util.jsMessage('Estimando o número de reversões feitas entre ' + from + ' e ' + to + ' por ' + userName + '...');
			api.getTotalRevertsByUser( userName, from, to )
			.done( function( total ){
				var i;
				table[index] = [ userName, total ];
				index++;
				if ( index < userList.length ){
					addUserRevertsToTable( userList[ index ] );
				} else {
					for( i = 0; i < table.length; i++ ){
						wikitable += '|-\n| ' + table[i][0] + ' || ' + table[i][1] + '\n';
					}
					wikitable += '|}\n';
					statsDeferred.resolve( wikitable );
				}
			} )
			.fail( statsDeferred.reject );
		};
	addUserRevertsToTable( userList[ index ] );

	return statsDeferred.promise();
},
getStatsForListOfUsers = function( list ){
	var	listDeferred = $.Deferred(),
		stats = '',
		periodId = 0,
		periods = [
			{
				from: '2011-01-01T00:00:00Z',
				to: '2011-01-07T23:59:59Z'
			},{
				from: '2011-01-08T00:00:00Z',
				to: '2011-01-14T23:59:59Z'
			}/*,{
				from: '2012-01-12T00:00:00Z',
				to: '2012-04-11T23:59:59Z'
			},{
				from: '2012-04-12T00:00:00Z',
				to: '2012-07-11T23:59:59Z'
			}*/
		],
		addStatsForPeriod = function( period ){
			getRevertStats( list, period.from, period.to )
			.done(function( wikitable ){
				stats += '\n' + wikitable;
				periodId++;
				if( periodId < periods.length){
					addStatsForPeriod( periods[periodId] );
				} else{
					listDeferred.resolve( stats );
				}
			})
			.fail( listDeferred.reject );
		};
	addStatsForPeriod( periods[periodId] );

	return listDeferred.promise();
},
run = function( list ){
	getStatsForListOfUsers( list )
	.done(function( wikiCode ){
		mw.util.jsMessage( '<pre>== Resultado ==\n' + wikiCode + '</pre>' );
	});
},
load = function( e ){
	var $button = $('<input />', {
			id: 'stats-button',
			name: 'stats-button',
			type: 'submit',
			tabindex: 2,
			value: 'Obter estatísticas',
			title: 'Obter as estatísticas referentes à lista de editores fornecida'
		})
		.click( function(){
			$button.prop('disabled', true);
			run( $('#stats-list').val().split('\n') );
		} ),
		$list = $('<textarea />', {
			id: 'stats-list',
			name: 'stats-list',
			rows: 10,
			tabindex: 1
		}).text( 'Fulano\nCiclano' );

	e.preventDefault();
	$('#mw-content-text')
	.prepend( $button )
	.prepend( $list )
	.prepend('<p>Lista de editores (um item em cada linha):</p>');
},
addLink = function(){
	$( mw.util.addPortletLink(
		'p-cactions',
		'#',
		'Estatísticas de edição',
		'ca-my-portlet',
		'Obter estatísticas relativas às edições de um grupo de editores em determinado período'
	) ).click( load );
};

if ( mw.config.get( 'wgPageName' ) === 'Wikipédia:Estatísticas' ) {
	$( addLink );
}

}( mediaWiki, jQuery ) );