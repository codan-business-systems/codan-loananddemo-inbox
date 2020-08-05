sap.ui.controller("cross.fnd.fiori.inbox.LoanAndDemoInbox.view.S3Custom", {

	oSalesOrderModel: undefined,
	_sContextPath: "",
	oDataManager: undefined,
	oModel: undefined,
	

	/**
	 * Called when a controller is instantiated and its View controls (if available) are already created.
	 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
	 * @memberOf cross.fnd.fiori.inbox.LoanAndDemoInbox.view.S3Custom
	 */
	onInit: function () {
		
		var view = this.getView(),
			that = this;
		
		cross.fnd.fiori.inbox.view.S3.prototype.onInit.call(this);
		
		// Instantiate our own model for holding Sales Order Item details
		this.oSalesOrderModel = new sap.ui.model.json.JSONModel({
			items: [],
			itemsCount: 0,
			expenditureApproval: false,
			busy: false,
			userStatus: "",
			expenditureMode: false,
			csAdminMode: false
		});
		
		this.oDataManager = sap.ca.scfld.md.app.Application.getImpl().getComponent().getDataManager();
		this.oModel = this.oDataManager.oModel;

		view.setModel(this.oSalesOrderModel, "salesOrder");
		
		view.attachAfterRendering(function() {
			that.setSalesOrderTabSelected();
		});
		
	},

	/**
	 * Gave up trying to include these in their own formatter file
	 */
	getCustomAttribute: function (aAttr, sKey) {
		if (!aAttr || aAttr.length === 0 || !sKey) {
			return "";
		}
		var key = "Name='" + sKey.toUpperCase() + "'";
		
		var sPath = aAttr.find(function (s) {
			return s.indexOf(key) > 0;
		});
		if (!sPath) {
			return "";
		}
		return this.oModel.getProperty("/" + sPath + "/Value");
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
	getValidToDate: function (aAttr) {
		return "Valid To: " + this.formatAbapDate(this.getCustomAttribute(aAttr, "validTo"));
	},
	
	formatAbapDate: function (sDate) {
		return sDate.substr(6,2) + "/" + sDate.substr(4,2) + "/" + sDate.substr(0,4);	
	},
	
	getUserStatus: function() {
		return this.getCustomAttribute(this.oModel.getProperty(this._sContextPath + "/CustomAttributeData"), "userStatus");
	},

	handleNavToDetail: function (e) {

		cross.fnd.fiori.inbox.view.S3.prototype.handleNavToDetail.call(this, e);

		this.salesOrderLoaded = this.loadSalesOrderItems(e);
		
		this.setSalesOrderTabSelected();
		
		this.setButtons();
		
	},

	loadSalesOrderItems: function (e) {

		var model = this.oSalesOrderModel,
			erpModel = this.getView().getModel("salesOrderERP"),
			args = e.getParameter("arguments"),
			workitemId = args.InstanceID,
			filters = [];
			
		model.setProperty("/busy", true);
		
		this._sContextPath = "/" + args.contextPath;
		
		var userStatus = this.getUserStatus();
		model.setProperty("/userStatus", userStatus);
		model.setProperty("/expenditureMode", userStatus === "EXPA");
		model.setProperty("/csAdminMode", userStatus === "CSAC");
		
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
					
					model.setProperty("/busy", false); 

					res();
				},
				error: function (err) {
					model.setProperty("/busy", false); 
					//TODO - what do these errors look like
					rej();
				}
			});
		});
	},
	
	setButtons: function() {
		var saveButton = {
			action: "zSaveItems",
			label: "Save Item Flags"
		};
		if (this.oSalesOrderModel.getProperty("/csAdminMode")) {
			this.addAction(saveButton, this.saveItemFlags, this);
		} else {
			this.removeAction(saveButton);
		}
	},
	
	saveItemFlags: function() {
		var model = this.oSalesOrderModel,
			targetModel = this.getView().getModel("salesOrderERP");
			
		model.getProperty("/items").forEach(function(i) {
			var key = "/" + targetModel.createKey("Items", i);
			targetModel.setProperty(key + "/externalProcureFlag", i.externalProcureFlag);
		});
		
		if (!targetModel.hasPendingChanges()) {
			sap.m.MessageToast.show("No changes to save", {
				duration: 5000
			});
			return;
		}
		
		targetModel.setProperty("/busy", true);
		
		targetModel.submitChanges({
			success: function(data) {
				model.setProperty("/busy", false);
				sap.m.MessageToast.show("Changes saved successfully", {
					duration: 5000
				});
			},
			error: function(err) {
				model.setProperty("/busy", false);
				sap.m.MessageBox.Error("Error saving item flags");
				targetModel.resetPendingChanges();
			}
		});
		
	},
	
	setSalesOrderTabSelected: function() {
		var d = this.oTabBar.getItems()[4];
        this.oTabBar.setSelectedItem(d);
	},
	

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

	extHookChangeFooterButtons: function (B) {
		// Place your hook implementation code here 
		
		B.aButtonList = B.aButtonList.filter(function(o) {
			switch(o.sBtnTxt || o.sI18nBtnTxt) {
				case "Approved":
					B.oPositiveAction = o;
					return false;
				case "Rejected":
					B.oNegativeAction = o;
					return false;
				default:
					return false;
			}
		});
		
		if (this.oSalesOrderModel.getProperty("/csAdminMode")) {
			B.aButtonList.push({
				actionId: "zSaveItems",
				sBtnTxt: "Save Item Flags",
				onBtnPressed: jQuery.proxy(this.saveItemFlags, this)
			});
		}

	}
});