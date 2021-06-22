sap.ui.define([
	"sap/m/MessageBox",
	"sap/ui/core/ValueState",
	"cross/fnd/fiori/inbox/LoanAndDemoInbox/model/utils",
	"sap/m/MessageToast",
	"sap/ui/core/format/DateFormat"
], function (MessageBox, ValueState, utils, MessageToast, DateFormat) {
	"use strict";

	return sap.ui.controller("cross.fnd.fiori.inbox.LoanAndDemoInbox.view.S3Custom", {

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
				header: undefined,
				items: [],
				itemsCount: 0,
				busy: false,
				userStatus: "",
				expenditureMode: false,
				csAdminMode: false,
				reviewMode: false,
				hasReviewQuantities: false
			});

			this.oDataManager = sap.ca.scfld.md.app.Application.getImpl().getComponent().getDataManager();
			this.oModel = this.oDataManager.oModel;
			
			this.abapDateFormatter = DateFormat.getDateInstance({
					pattern: "yyyyMMdd"
				});

			view.setModel(this.oSalesOrderModel, "salesOrder");

			view.attachAfterRendering(function () {
				that.setSalesOrderTabSelected();
			});

		},

		createGenericCommentsComponent: function (v) {
			cross.fnd.fiori.inbox.view.S3.prototype.createGenericCommentsComponent.call(this, v);

			/* Set the input control to invisible to make the tab read only */
			this.oGenericCommentsComponent.getAggregation("rootControl").getContent()[0].setVisible(false);
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
		getTotalCost: function (aAttr) {
			return this.formatCurrency(this.getCustomAttribute(aAttr, "totalCost"));
		},
		getTodaysDate: function () {
			return new Date();
		},
		getValidToDate: function (aAttr) {
			return "Valid To: " + this.formatAbapDate(this.getCustomAttribute(aAttr, "validTo"));
		},

		formatAbapDate: function (sDate) {
			return sDate.substr(6, 2) + "/" + sDate.substr(4, 2) + "/" + sDate.substr(0, 4);
		},

		formatCurrency: function (sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		},

		getUserStatus: function () {
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
				filters = [],
				that = this;

			model.setProperty("/busy", true);

			this._sContextPath = "/" + args.contextPath;

			var userStatus = this.getUserStatus();
			model.setProperty("/userStatus", userStatus);
			model.setProperty("/expenditureMode", userStatus === "EXPA");
			var csAdminMode = userStatus === "CSAC";
			model.setProperty("/csAdminMode", csAdminMode);
			model.setProperty("/reviewMode", false);
			model.setProperty("/hasReviewQuantities", false);

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

							model.setProperty("/header", salesOrder);
							model.setProperty("/originalGeneralComms", salesOrder.generalComms);

							if (salesOrder.ToItems && salesOrder.ToItems.results && salesOrder.ToItems.results.length > 0) {
								items = salesOrder.ToItems.results.map(function (i) {
									var result = Object.assign({}, i);
									result.externalProcureQty = {
										value: parseFloat(i.externalProcureQty.toString()),
										valueState: ValueState.None
									};
									result.reviewQty = {
										value: i.reviewQty ? parseFloat(i.reviewQty.toString()) : "",
										valueState: ValueState.None
									};

									result.dateRequired = {
										value: that.abapDateFormatter.format(i.dateRequired),
										valueState: ValueState.None,
										valueStateText: ""
									};

									if (csAdminMode && Number(result.reviewQty.value) > 0) {
										model.setProperty("/hasReviewQuantities", true);
									}
									return result;
								});

								model.setProperty("/items", items);

								model.setProperty("/itemsCount", items.length);

							}

						}

						if (model.getProperty("/hasReviewQuantities")) {
							items.forEach(function (i) {
								if (!i.reviewQty.value && i.externalProcureFlag) {
									i.reviewQty.value = i.externalProcureQty.value;
								}
							});
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

		onExternalProcureFlagSelected: function (oEvent) {
			var path = oEvent.getSource().getBindingContext("salesOrder").getPath(),
				model = this.oSalesOrderModel;

			model.setProperty(path + "/externalProcureQty/value",
				oEvent.getParameter("selected") ? model.getProperty(path + "/reqQty") : "0");
		},
		
		setRequiredDateForAll: function(oEvent) {
			var path = oEvent.getSource().getBindingContext("salesOrder").getPath(),
				model = this.oSalesOrderModel,
				targetDate = model.getProperty(path + "/dateRequired/value"),
				items = model.getProperty("/items");
				
			items.forEach(function(i) {
				if (i.externalProcureFlag) {
					i.dateRequired.value = targetDate;
				}	
			});
			this.oSalesOrderModel.refresh();
		},

		setButtons: function () {
			var saveButton = {
				action: "zSaveItems",
				label: "Save Item Flags"
			};

			this.addAction(saveButton, this.saveAll, this);

		},

		requestReview: function (oEvent) {
			if (!this.oSalesOrderModel.getProperty("/reviewMode")) {
				this._enableReviewMode();
			} else {
				this._disableReviewMode();
			}
		},

		saveAll: function (bApproving) {
			var model = this.oSalesOrderModel,
				targetModel = this.getView().getModel("salesOrderERP"),
				reviewMode = model.getProperty("/reviewMode"),
				hasReviewQuantities = model.getProperty("/hasReviewQuantities"),
				generalCommsText = model.getProperty("/header/generalComms"),
				generalTextChanged = generalCommsText !== model.getProperty("/originalGeneralComms"),
				error = false,
				headerKey = "/" + targetModel.createKey("Headers", model.getProperty("/header")),
				that = this;

			sap.ui.core.BusyIndicator.show(100);

			return new Promise(function (res, rej) {

				if (!model.getProperty("/csAdminMode") && !reviewMode && !generalTextChanged) {
					sap.ui.core.BusyIndicator.hide();
					res();
					return;
				}

				if (generalTextChanged) {
					targetModel.setProperty(headerKey + "/generalComms", generalCommsText);
				}
				if (model.getProperty("/csAdminMode") || reviewMode) {
					model.getProperty("/items").forEach(function (i) {

						if (!reviewMode && i.externalProcureFlag) {
							if (Number(i.externalProcureQty.value <= 0) || Number(i.externalProcureQty.value) > Number(i.reqQty)) {
								i.externalProcureQty.valueState = ValueState.Error;
								error = true;
							} else {
								i.externalProcureQty.valueState = ValueState.None;
							}
							
							if (!i.dateRequired.value) {
								i.dateRequired.valueState = ValueState.Error;
								error = true;
								i.dateRequired.valueStateText = "Enter a valid date";
							} 
						}

						if (reviewMode || hasReviewQuantities) {
							if (i.reviewQty && (Number(i.reviewQty.value < 0) || Number(i.reviewQty.value) > Number(i.externalProcureQty.value))) {
								i.reviewQty.valueState = ValueState.Error;
								error = true;
							} else {
								i.reviewQty.valueState = ValueState.None;
							}
						}

						var key = "/" + targetModel.createKey("Items", i);

						if (!reviewMode) {
							targetModel.setProperty(key + "/externalProcureFlag", i.externalProcureFlag);
							targetModel.setProperty(key + "/externalProcureQty", i.externalProcureFlag ? i.externalProcureQty.value.toString() : "0");
							if (i.externalProcureFlag) {
								targetModel.setProperty(key + "/dateRequired", new Date(that.abapDateFormatter.parse(i.dateRequired.value).setHours(12)));
							}
						} else {
							targetModel.setProperty(key + "/reviewQty", i.reviewQty.value.toString() || i.externalProcureQty.value.toString() || "0");
						}
					});

				}

				model.refresh();

				if (error) {
					targetModel.resetChanges();
					sap.ui.core.BusyIndicator.hide();
					MessageBox.error("Correct DC Req quantity errors and try again", {
						duration: 10000
					});
					rej && rej();
					return;
				} else if (bApproving && hasReviewQuantities) {
					model.getProperty("/items").forEach(function (i) {
						var key = "/" + targetModel.createKey("Items", i);
						if (i.externalProcureFlag) {
							targetModel.setProperty(key + "/externalProcureQty", i.reviewQty.value.toString || "0");
						}
					});
				}

				if (!targetModel.hasPendingChanges()) {
					MessageToast.show("No changes to save", {
						duration: 5000
					});
					sap.ui.core.BusyIndicator.hide();
					res();
					return;
				}

				targetModel.setProperty("/busy", true);

				targetModel.submitChanges({
					success: function (data) {
						model.setProperty("/busy", false);

						if (generalTextChanged) {
							model.setProperty("/originalGeneralComms");
						}

						var resultMessage = utils.getBatchErrorMessage(data);
						if (!resultMessage) {
							MessageToast.show("Changes saved successfully", {
								duration: 5000
							});
							sap.ui.core.BusyIndicator.hide();
							res();
						} else {
							targetModel.resetChanges();
							sap.ui.core.BusyIndicator.hide();
							MessageBox.error("Error saving item details\n\n" + resultMessage);
							rej && rej();
						}
					},
					error: function (err) {
						model.setProperty("/busy", false);
						sap.ui.core.BusyIndicator.hide();
						sap.m.MessageBox.Error("Error saving item flags");
						targetModel.resetChanges();
						rej && rej();
					}
				});
			});

		},

		setSalesOrderTabSelected: function () {
			var d = this.oTabBar.getItems()[4];
			this.oTabBar.setSelectedItem(d);
		},

		showDecisionDialog: function (sFunctionImportName, oDecision, bShowNote) {
			var that = this,
				args = arguments,
				approving = oDecision.Nature === "POSITIVE";
			this.saveAll(approving).then(function () {
				cross.fnd.fiori.inbox.view.S3.prototype.showDecisionDialog.call(that, args[0], args[1], args[2]);
			});
		},

		_disableReviewMode: function () {
			this.oSalesOrderModel.setProperty("/reviewMode", false);

			var reviewBtn = this.oHeaderFooterOptions.buttonList.find(function (b) {
				return b.actionId === "zRequestReview";
			});

			if (reviewBtn) {
				reviewBtn.sBtnTxt = "Request Review";
			}

			this.oHeaderFooterOptions.oNegativeAction = Object.assign(this.standardRejectButton, {});
			this.oHeaderFooterOptions.oPositiveAction = Object.assign(this.standardAcceptButton, {});

			this.refreshHeaderFooterOptions();
		},

		_enableReviewMode: function () {

			this.oSalesOrderModel.setProperty("/reviewMode", true);
			var reviewBtn = this.oHeaderFooterOptions.buttonList.find(function (b) {
				return b.actionId === "zRequestReview";
			});

			if (reviewBtn) {
				reviewBtn.sBtnTxt = "Cancel";
			}

			this.standardRejectButton = Object.assign(this.oHeaderFooterOptions.oNegativeAction, {});
			this.standardAcceptButton = Object.assign(this.oHeaderFooterOptions.oPositiveAction, {});

			this.oHeaderFooterOptions.oNegativeAction = {
				sBtnTxt: "Send for Review",
				onBtnPressed: jQuery.proxy(this._sendForReview, this)
			};

			this.oHeaderFooterOptions.oPositiveAction = null;

			this.refreshHeaderFooterOptions();

		},

		_sendForReview: function () {
			var decisions = this.oDataManager.getDataFromCache("DecisionOptions", this.oContext.getObject()),
				decision = decisions.find(function (d) {
					return d.DecisionKey === "0003";
				});

			if (!decision) {
				MessageBox.error("Error in process flow");
			}

			this.showDecisionDialog(this.oDataManager.FUNCTION_IMPORT_DECISION, decision, true);
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

			B.aButtonList = B.aButtonList.filter(function (o) {
				switch (o.sBtnTxt || o.sI18nBtnTxt) {
				case "Approve":
					B.oPositiveAction = o;
					return false;
				case "Reject":
					B.oNegativeAction = o;
					return false;
				default:
					return false;
				}
			});

			B.aButtonList.push({
				actionId: "zSaveItems",
				sBtnTxt: "Save",
				onBtnPressed: jQuery.proxy(this.saveAll, this)
			});

			if (this.oSalesOrderModel.getProperty("/expenditureMode")) {
				B.aButtonList.push({
					actionId: "zRequestReview",
					sBtnTxt: "Request Review",
					onBtnPressed: jQuery.proxy(this.requestReview, this)
				});
			}

			B.oJamOptions = {};
			B.oEmailSettings = {};

		}
	});
});