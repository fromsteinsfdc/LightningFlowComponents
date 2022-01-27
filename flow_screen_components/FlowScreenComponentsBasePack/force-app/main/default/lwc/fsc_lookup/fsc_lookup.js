import { LightningElement, api, track, wire } from 'lwc';
import search from '@salesforce/apex/FscLookupController.search';
import getRecentlyViewed from '@salesforce/apex/FscLookupController.getRecentlyViewed';

const DEFAULTS = {
    NUM_RECENTLY_VIEWED: 5,
    DEBOUNCE_DELAY: 200
}

export default class Fsc_lookup extends LightningElement {
    @api objectName;

    @api label = 'Select Record';
    @api required;
    @api allowMultiselect;
    @api publicClass;
    @api publicStyle;
    @api debounceDelay = DEFAULTS.DEBOUNCE_DELAY;
    @api fieldsToSearch = '';
    @api fieldsToDisplay = '';
    @api iconName;
    @api excludeSublabelInFilter = false;   // If true, the 'sublabel' text of an option is included when determining if an option is a match for a given search text.
    @api includeValueInFilter = false;  // If true, the 'value' text of an option is not included when determining if an option is a match for a given search text.
    @api whereClause; // Reserved for future use
    @api orderByClause; // Reserved for future use
    @track recentlyViewedRecords = [];
    @track records = [];

    @api
    get values() {
        return this._values || [];
    }
    set values(values) {
        if (!values) {
            this._values = [];
        } else {
            this._values = Array.isArray(values) ? values : [values];
        }
    }
    @track _values = [];

    @api
    get value() {
        return this.values.length ? this.values[0] : null;
    }
    set value(value) {
        this.values = value ? [value] : [];
    }

    @api
    get selectedRecords() {
        let records = [];
        for (let value of this.values) {
            records.push(this.records.find(rec => rec.value === value));
        }
        return records;
    }

    @api
    get selectedRecord() {
        return this.selectedRecords.length ? this.selectedRecords[0] : null;
    }

    connectedCallback() {
        console.log('objectName = ' + this.objectName);        
    }

    @wire(getRecentlyViewed, { objectName: '$objectName', fieldsToReturn: '$fieldsToDisplay', numRecordsToReturn: DEFAULTS.NUM_RECENTLY_VIEWED })
    handleGetRecentlyViewed( {error, data }) {
        console.log('in handleGetRecentlyViewed');
        if (data) {
            console.log('in data');
            this.recentlyViewedRecords = this.parseFields(data);
            console.log(JSON.stringify(this.recentlyViewedRecords));
            if (!this.records.length) {
                this.resetRecentlyViewed();                
            }
        } else if (error) {
            console.log('in error');
            console.log(JSON.stringify(error));
        }
    }

    handleSearchChange = (searchText) => {
        if (!searchText) {
            this.resetRecentlyViewed();
        } else {
            search({ 
                searchTerm: searchText, 
                objectName: this.objectName, 
                fieldsToSearch: this.fieldsToSearch || (this.excludeSublabelInFilter ? null : this.fieldsToDisplay), 
                fieldsToReturn: this.fieldsToDisplay,
                whereClause: this.whereClause,
                orderByClause: this.orderByClause,
                numRecordsToReturn: 0
            }).then(result => {
                this.records = this.parseFields(result);
            }).catch(error => {
                console.log('in error');
                console.log(JSON.stringify(error));
            })
        }
    }

    parseFields(apexResults) {
        let displayFields, labelField, sublabel;
        if (this.fieldsToDisplay) {
            displayFields = this.fieldsToDisplay.split(',');
            labelField = displayFields.splice(0, 1);
        }

        return apexResults.map(record => {
            if (!labelField) {
                let nonIdFields = Object.keys(record).filter(fieldName => fieldName != 'Id');
                if (nonIdFields.length !== 1) {
                    // THROW ERROR
                    console.log('Error: expected exactly one other field');
                }
                labelField = nonIdFields[0];
            }
            if (displayFields && displayFields.length) {
                let sublabelValues = [];
                for (let sublabelField of displayFields) {
                    if (record[sublabelField]) {
                        sublabelValues.push(record[sublabelField]);
                    }
                }
                sublabel = sublabelValues.join(' • ');
            }
            return {
                label: record[labelField],
                value: record.Id,
                sublabel: sublabel,
                icon: this.iconName
            }
        });
    }

    resetRecentlyViewed() {
        this.records = this.recentlyViewedRecords.map(rec => Object.assign({}, rec));
    }

    handleComboboxChange(event) {
        if (this.allowMultiselect) {
            this.values = event.detail.values;    
        } else {
            this.value = event.detail.value;
        }
        this.dispatchRecords();
    }

    dispatchRecords() {
        let detail;
        if (this.allowMultiselect) {
            detail = {
                values: this.values,
                selectedRecords: this.selectedRecords
            }
        } else {
            detail = {
                value: this.value,
                selectedRecord: this.selectedRecord
            }
        }
        console.log('about to dispatch, '+ JSON.stringify(detail));
        this.dispatchEvent(new CustomEvent('recordchange', { detail: detail }));
    }
}