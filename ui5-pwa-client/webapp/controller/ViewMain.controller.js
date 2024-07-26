sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/DisplayListItem"
], function (Controller, DisplayListItem) {
	"use strict";

	var aTasks = {};
	var serverUrl = `https://service-worker-web-push-example-server.cfapps.us10-001.hana.ondemand.com`;

	return Controller.extend("com.jp.ui5-pwa-todo-list.controller.ViewMain", {

		onInit: function () {
			this._loadTasks();
			this._populateList();

		},
		onAfterRendering: function () {
			Notification.requestPermission((result) => {
				console.log('User Choice', result);
				if (result !== 'granted') {
					console.log('No notification permission granted!');
				} else {
					console.log('Notification permission granted!');
					// this.onPressRegister().then();
					// displayConfirmNotification();
					// configurePushSubscription();
				}
			});
		},

		onLiveChangeAddTask: function (oEvent) {
			var oButtonAddTask = this.getView().byId("buttonAddTask");
			oButtonAddTask.setEnabled(!!oEvent.getParameter("value"));
		},

		onPressRegister: async function (oEvent) {
			const { pubkey } = await fetch(`${serverUrl}/pubkey`).then((res) => res.json());
			console.log('fetched public key:', pubkey);
			let subscription;



			subscription = navigator.serviceWorker
				.getRegistration()
				.then((registration) => {
					registration.pushManager.getSubscription()
						.then(pushSubscription => {
							if (!pushSubscription) {
								//the user was never subscribed
								return registration.pushManager.subscribe({
									userVisibleOnly: true,
									applicationServerKey: this._urlB64ToUint8Array(pubkey),
								}).then(subscription => {
									console.log('created subscription:', subscription);
									// in production we would send it directly to our server and not store it on the window
									window.mySubscription = subscription;
									if (!window.mySubscription) {
										console.log('No subscription yet created');
										return;
									}
									const subscriptionToSend = JSON.stringify(window.mySubscription.toJSON(), null, 2);

									fetch(`${serverUrl}/subscription`, {
										method: 'POST',
										body: subscriptionToSend,
										headers: {
											'Content-Type': 'application/json',
										},
									})
										.then((res) => console.log('successfully send subscription to server'))
										.catch((err) => console.log('error while sending to server', err));
								});
							}
							else {
								//check if user was subscribed with a different key
								let json = pushSubscription.toJSON();
								let public_key = json.keys.p256dh;

								console.log(public_key);

								if (public_key != pubkey) {
									pushSubscription.unsubscribe().then(successful => {
										// You've successfully unsubscribed
										return registration.pushManager.subscribe({
											userVisibleOnly: true,
											applicationServerKey: this._urlB64ToUint8Array(pubkey),
										}).then(subscription => {
											console.log('created subscription:', subscription);
											// in production we would send it directly to our server and not store it on the window
											window.mySubscription = subscription;
											if (!window.mySubscription) {
												console.log('No subscription yet created');
												return;
											}
											const subscriptionToSend = JSON.stringify(window.mySubscription.toJSON(), null, 2);

											fetch(`${serverUrl}/subscription`, {
												method: 'POST',
												body: subscriptionToSend,
												headers: {
													'Content-Type': 'application/json',
												},
											})
												.then((res) => console.log('successfully send subscription to server'))
												.catch((err) => console.log('error while sending to server', err));
										});
									}).catch(e => {
										console.log(e);
										// Unsubscription failed
									})
								}
							}
						});
				}
				);


			// .then((registration) => {
			// 	return registration.pushManager.subscribe({
			// 		userVisibleOnly: true,
			// 		applicationServerKey: this._urlB64ToUint8Array(pubkey),
			// 	});
			// });

		},
		_subscribe(subscription) {
			console.log('created subscription:', subscription);
			// in production we would send it directly to our server and not store it on the window
			window.mySubscription = subscription;
			if (!window.mySubscription) {
				console.log('No subscription yet created');
				return;
			}
			const subscriptionToSend = JSON.stringify(window.mySubscription.toJSON(), null, 2);

			fetch(`${serverUrl}/subscription`, {
				method: 'POST',
				body: subscriptionToSend,
				headers: {
					'Content-Type': 'application/json',
				},
			})
				.then((res) => console.log('successfully send subscription to server'))
				.catch((err) => console.log('error while sending to server', err));
		},
		onPressUnsubscribe: function (oEvent) {
			if (!window.mySubscription) {
				alert('No subscription yet created');
				return;
			}
			const subscriptionToSend = JSON.stringify(window.mySubscription.toJSON(), null, 2);

			fetch(`${serverUrl}/unsubscription`, {
				method: 'POST',
				body: subscriptionToSend,
				headers: {
					'Content-Type': 'application/json',
				},
			})
				.then((res) => alert('successfully unsubscribed'))
				.catch((err) => alert('error during unsubscribing', err));
		},
		onPressSubscribe: function (oEvent) {
			Notification.requestPermission((result) => {
				console.log('User Choice', result);
				if (result !== 'granted') {
					console.log('No notification permission granted!');
				} else {
					console.log('Notification permission granted!');
					this.onPressRegister().then();
					// displayConfirmNotification();
					// configurePushSubscription();
				}
			});
		},
		onPressSendNotification: async (oEvent) => {
			try {
				await fetch(`${serverUrl}/send`).then((res) => res.json());
			} catch (error) {
				alert('Problem with server')
			}

			// if ('Notification' in window) {
			// 	alert('Notification in window')
			// };

			// var oInputAddTask = this.getView().byId("inputAddTask");
			// var oButtonAddTask = this.getView().byId("buttonAddTask");

			// var sTaskDescription = oInputAddTask.getValue();

			// if (sTaskDescription) {
			// 	var task = this._addTask(sTaskDescription);

			// 	this._createListItem(task);
			// 	oInputAddTask.setValue("");

			// 	oButtonAddTask.setEnabled(false);
			// }
		},

		onDeleteItem: function (oEvent) {
			this._deleteListItem(oEvent.getParameter("listItem"));
		},


		_addTask: function (sTaskDescription) {
			var id = Date.now();
			aTasks[id] = { id: id, t: sTaskDescription };

			this._saveTasks();
			return aTasks[id];
		},
		_urlB64ToUint8Array: function (base64String) {
			const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
			const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

			const rawData = window.atob(base64);
			const outputArray = new Uint8Array(rawData.length);

			for (let i = 0; i < rawData.length; ++i) {
				outputArray[i] = rawData.charCodeAt(i);
			}
			return outputArray;
		},

		_deleteTask: function (id) {
			delete aTasks[id];
			this._saveTasks();
		},

		_loadTasks: function () {
			var json = localStorage.getItem("tasks");

			try {
				aTasks = JSON.parse(json) || {};
			} catch (e) {
				jQuery.sap.log.error(e.message);
			}
		},

		_saveTasks: function () {
			localStorage.setItem("tasks", JSON.stringify(aTasks));
		},

		_populateList: function () {
			for (var id in aTasks) {
				this._createListItem(aTasks[id]);
			}
		},

		_createListItem: function (mTask) {
			var oListTodo = this.getView().byId("listTodo");

			var listItem = new DisplayListItem({ label: mTask.t }).data("id", mTask.id);

			oListTodo.addAggregation("items", listItem);
		},

		_deleteListItem: function (oListItem) {
			var oListTodo = this.getView().byId("listTodo");
			var id = oListItem.data("id");

			oListTodo.removeAggregation("items", oListItem);
			this._deleteTask(id);
		}
	});
});