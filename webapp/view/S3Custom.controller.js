sap.ui.controller("cross.fnd.fiori.inbox.LoanAndDemoInbox.view.S3Custom", {

	oSalesOrderModel: {},

	/**
	 * Called when a controller is instantiated and its View controls (if available) are already created.
	 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
	 * @memberOf cross.fnd.fiori.inbox.LoanAndDemoInbox.view.S3Custom
	 */
	onInit: function () {
		cross.fnd.fiori.inbox.view.S3.prototype.onInit.call(this);

		// Instantiate our own model for holding Sales Order Item details
		this.oSalesOrderModel = new sap.ui.model.json.JSONModel({
			items: [],
			itemsCount: 0
		});

		this.getView().setModel(this.oSalesOrderModel, "salesOrder");
	},

	/**
	 * Gave up trying to include these in their own formatter file
	 */
	getCustomAttribute: function (aAttr, sKey) {
		if (!aAttr || aAttr.length === 0 || !sKey) {
			return "";
		}
		var key = "Name='" + sKey.toUpperCase() + "'",
			oDataManager = sap.ca.scfld.md.app.Application.getImpl().getComponent().getDataManager(),
			oModel = oDataManager.oModel;
		var sPath = aAttr.find(function (s) {
			return s.indexOf(key) > 0;
		});
		if (!sPath) {
			return "";
		}
		return oModel.getProperty("/" + sPath + "/Value");
	},
	getActualCreatedBy: function (aAttr) {
		return this.getCustomAttribute(aAttr, "actualCreatedBy");
	},
	getSalesOrderNumber: function (aAttr) {
		return "Sales Order: " + this.getCustomAttribute(aAttr, "salesOrderNumberFormatted");
	},
	getPurchaseOrderNumber: function (aAttr) {
		return "Purchase Order: " + this.getCustomAttribute(aAttr, "purchaseOrder");
	},
	getStatusText: function (aAttr) {
		return this.getCustomAttribute(aAttr, "userStatusText") + " (" + this.getCustomAttribute(aAttr, "userStatus") + ")";
	},

	handleNavToDetail: function (e) {

		cross.fnd.fiori.inbox.view.S3.prototype.handleNavToDetail.call(this, e);

		this.salesOrderLoaded = this.loadSalesOrderItems(e);

	},

	loadSalesOrderItems: function (e) {

		var t = this,
			model = this.oSalesOrderModel,
			erpModel = this.getView().getModel("salesOrderERP"),
			workitemId = e.getParameter("arguments").InstanceID,
			filters = [];

		return new Promise(function (res, rej) {
			filters.push(new sap.ui.model.Filter({
				path: "workitemId",
				operator: "EQ",
				value1: workitemId
			}));

			erpModel.read("/Headers", {
				filters: filters,
				urlParameters: {
					"$expand": "ToItems"
				},
				success: function (data) {
					if (data && data.results && data.results.length > 0) {
						var salesOrder = data.results[0],
							items = [];

						if (salesOrder.ToItems && salesOrder.ToItems.results && salesOrder.ToItems.results.length > 0) {
							items = salesOrder.ToItems.results.map(function (i) {
								return Object.assign({}, i);
							});

							model.setProperty("/items", items);

							model.setProperty("/itemsCount", items.length);

						}

					}

					res();
				},
				error: function (err) {
					//TODO
					rej();
				}
			});
		});
	}

	/**
	 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
	 * (NOT before the first rendering! onInit() is used for that one!).
	 * @memberOf cross.fnd.fiori.inbox.LoanAndDemoInbox.view.S3Custom
	 */
	//	onBeforeRendering: function() {
	//
	//	},
	/**
	 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
	 * This hook is the same one that SAPUI5 controls get after being rendered.
	 * @memberOf cross.fnd.fiori.inbox.LoanAndDemoInbox.view.S3Custom
	 */
	//	onAfterRendering: function() {
	//
	//	},
	/**
	 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
	 * @memberOf cross.fnd.fiori.inbox.LoanAndDemoInbox.view.S3Custom
	 */
	//	onExit: function() {
	//
	//	},
	//	onTaskCollectionFailed: function() {
	//
	//	}
	//	onShowReleaseLoaderOnInfoTab: function(c, e, v) {
	//
	//	}
	//	onShowReleaseLoader: function(c, e, v) {
	//
	//	}
	//	createGenericAttachmentComponent: function(v) {
	//
	//	}
	//	createGenericCommentsComponent: function(v) {
	//
	//	}
	//	handleNavToDetail: function(e) {
	//
	//	}
	//	fnPerpareToRefreshData: function(c, i, s) {
	//
	//	}
	//	fnIsTaskInstanceAllowed: function(i, d) {
	//
	//	}
	//	fnGetUploadUrl: function(c) {
	//
	//	}
	//	fnCreateAttachmentHandle: function(c) {
	//
	//	}
	//	fnRenderComponent: function(c) {
	//
	//	}
	//	fnParseComponentParameters: function(r) {
	//
	//	}
	//	fnCloneTaskModel: function(t) {
	//
	//	}
	//	fnShowHideDetailScrollBar: function(s) {
	//
	//	}
	//	switchToOutbox: function() {
	//
	//	}
	//	_updateDetailModel: function(i, m) {
	//
	//	}
	//	refreshData: function(r, d) {
	//
	//	}
	//	fnHandleIntentValidationAndNavigation: function(U, d, D, i, r, s) {
	//
	//	}
	//	fnHandleIntentNavigation: function(u, p, e, r, E, U, R, s) {
	//
	//	}
	//	fnRenderIntentBasedApp: function(p, U, r, s) {
	//
	//	}
	//	updateTask: function(S, T) {
	//
	//	}
	//	getDescription: function(S, T) {
	//
	//	}
	//	_setScaffoldingExtension: function(s) {
	//
	//	}
	//	_getScaffoldingExtension: function() {
	//
	//	}
	//	isMainScreen: function() {
	//
	//	}
	//	setShowFooter: function(s) {
	//
	//	}
	//	setShowNavButton: function(s, n) {
	//
	//	}
	//	onNavButtonPress: function(e) {
	//
	//	}
	//	fnGetTaskModelClone: function(r) {
	//
	//	}
	//	fnCreateURLParameters: function(d) {
	//
	//	}
	//	fnValidateDecisionOptionsAndCreatButtons: function(d, i, D, U, s) {
	//
	//	}
	//	fnDelegateTaskRefresh: function() {
	//
	//	}
	//	fnNavigateToApp: function(p, e) {
	//
	//	}
	//	_resetCountandDescription: function() {
	//
	//	}
	//	fnViewTaskInDefaultView: function(U, r, s) {
	//
	//	}
	//	fnGetDetailsForSelectedTask: function(U, r, s) {
	//
	//	}
	//	clearCustomAttributes: function() {
	//
	//	}
	//	onAttachmentChange: function(e) {
	//
	//	}
	//	onAttachmentUploadComplete: function(e) {
	//
	//	}
	//	onAttachmentDeleted: function(e) {
	//
	//	}
	//	getXsrfToken: function() {
	//
	//	}
	//	onFileUploadFailed: function(e) {
	//
	//	}
	//	addShareOnJamAndEmail: function(b) {
	//
	//	}
	//	_getDescriptionForShare: function(d) {
	//
	//	}
	//	_getDescriptionForShareInMail: function(d) {
	//
	//	}
	//	getJamSettings: function() {
	//
	//	}
	//	getJamDescription: function() {
	//
	//	}
	//	getMailSubject: function() {
	//
	//	}
	//	getMailBody: function() {
	//
	//	}
	//	_getIntentParam: function(p) {
	//
	//	}
	//	_getIntentWithOutParam: function(p) {
	//
	//	}
	//	_getTrimmedString: function(t) {
	//
	//	}
	//	_handleItemRemoved: function(e) {
	//
	//	}
	//	_handleDetailRefresh: function(e) {
	//
	//	}
	//	_updateHeaderTitle: function(d) {
	//
	//	}
	//	_isTaskConfirmable: function(i) {
	//
	//	}
	//	createDecisionButtons: function(d, u, o) {
	//
	//	}
	//	startForwardFilter: function(l, q) {
	//
	//	}
	//	closeForwardPopUp: function(r) {
	//
	//	}
	//	onForwardPopUp: function() {
	//
	//	}
	//	_isOpenModeSupported: function(r) {
	//
	//	}
	//	_isOpenModeEmpty: function(r) {
	//
	//	}
	//	_getParsedParamsForIntent: function(u) {
	//
	//	}
	//	_PotentialOwnersSuccess: function(r) {
	//
	//	}
	//	showResubmitPopUp: function() {
	//
	//	}
	//	handleResubmitPopOverOk: function(e) {
	//
	//	}
	//	showEmployeeCard: function(o, c, s) {
	//
	//	}
	//	onEmployeeLaunchTask: function(e) {
	//
	//	}
	//	onEmployeeLaunchCommentSender: function(c, e, E) {
	//
	//	}
	//	handleLogNavigation: function(e) {
	//
	//	}
	//	onEmployeeLaunchCommentIcon: function(e) {
	//
	//	}
	//	onAttachmentShow: function(e) {
	//
	//	}
	//	showDecisionDialog: function(f, d, s) {
	//
	//	}
	//	fnOnNavBackFromLogDescription: function(e) {
	//
	//	}
	//	showConfirmationDialog: function(f, i) {
	//
	//	}
	//	onCommentPost: function(c, e, E) {
	//
	//	}
	//	sendAction: function(f, d, n) {
	//
	//	}
	//	refreshHeaderFooterOptions: function() {
	//
	//	}
	//	fnNavBackToTableVw: function() {
	//
	//	}
	//	fnOnNavBackInMobile: function() {
	//
	//	}
	//	checkStatusAndOpenTaskUI: function() {
	//
	//	}
	//	openTaskUI: function() {
	//
	//	}
	//	fnEmbedApplicationInDetailView: function(p) {
	//
	//	}
	//	updateToggleButtonState: function(e) {
	//
	//	}
	//	onLogBtnPress: function(e) {
	//
	//	}
	//	setShowMainContent: function() {
	//
	//	}
	//	setShowSideContent: function(e) {
	//
	//	}
	//	createLogs: function(k) {
	//
	//	}
	//	createWorkflowLogTimeLine: function() {
	//
	//	}
	//	onLogTabSelect: function(c) {
	//
	//	}
	//	fnFetchDataOnLogTabSelect: function(n) {
	//
	//	}
	//	onTabSelect: function(c) {
	//
	//	}
	//	fnDelegateCommentsCreation: function() {
	//
	//	}
	//	fnDelegateAttachmentsCreation: function() {
	//
	//	}
	//	createTimeLine: function() {
	//
	//	}
	//	fnSetIconForCommentsFeedInput: function() {
	//
	//	}
	//	fnCountUpdater: function(k, s, i) {
	//
	//	}
	//	fnHandleNoTextCreation: function(e) {
	//
	//	}
	//	fnClearCachedData: function() {
	//
	//	}
	//	fnFetchDataOnTabSelect: function(n) {
	//
	//	}
	//	fnUpdateDataAfterFetchComplete: function(m, d, n, a) {
	//
	//	}
	//	_getIconTabControl: function(n) {
	//
	//	}
	//	fnFetchObjectLinks: function() {
	//
	//	}
	//	onSupportInfoOpenEvent: function(c, e, s) {
	//
	//	}
	//	addAction: function(a, f) {
	//
	//	}
	//	removeAction: function(a) {
	//
	//	}
	//	disableAction: function(a) {
	//
	//	}
	//	disableAllActions: function() {
	//
	//	}
	//	enableAction: function(a) {
	//
	//	}
	//	enableAllActions: function() {
	//
	//	}
	//	_createCustomAttributesElements: function(d, c) {
	//
	//	}
	//	_createCustomAttributesOnDataLoaded: function(c) {
	//
	//	}
	//	_getUploadCollectionControl: function() {
	//
	//	}
	//	_setBusyIncdicatorOnDetailControls: function(c, s) {
	//
	//	}
	//	_processCustomAttributesData: function(i) {
	//
	//	}
	//	_getShowAdditionalAttributes: function() {
	//
	//	}
	//	createCalendarEvent: function() {
	//
	//	}
	//	_getActionHelper: function() {
	//
	//	}
	,

	extHookChangeFooterButtons: function (B) {
		// Place your hook implementation code here 

		var mapped = B.aButtonList.map(function (o) {
			return o.sBtnTxt || o.sI18BtnTxt;
		});

		var remove = [];

		for (var j = 0; j < mapped.length; j++) {
			switch (mapped[j]) {
			case "Approved":
				B.oPositiveAction = B.aButtonList[j];
				remove.push(j);
				break;
			case "Rejected":
				B.oNegativeAction = B.aButtonList[j];
				remove.push(j);
				break;
			case "XBUTSHOWLOG":
			case "XBUT_OPEN":
				break;
			default:
				remove.push(j);
				break;
			}

		}

		for (j = remove.length; j > -1; j--) {
			B.aButtonList.splice(remove[j], 1);
		}

	}
});