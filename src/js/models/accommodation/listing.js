const ajaxGet = require('../../get-api-data')
const endpoints = require('../../api')
const browser = require('../../browser')
const querystring = require('../../get-url-parameter')
const locationSelector = require('../../location/locationSelector')

import { Accommodation, TypeFilter } from './types'

const ko = require('knockout')

const AccommodationListing = function () {
  const self = this

  self.items = ko.observableArray()
  self.selectedTypeFilterName = ko.observable('all')
  self.itemsToDisplay = ko.computed(() => {
    return self.selectedTypeFilterName() !== undefined && self.selectedTypeFilterName().length > 0 && self.selectedTypeFilterName() !== 'all'
      ? self.items().filter((i) => i.accommodationType() === self.selectedTypeFilterName())
      : self.items()
  }, self)
  self.noItemsAvailable = ko.computed(() => self.itemsToDisplay().length === 0, self)
  self.typeFilters = ko.observableArray()
  self.dataIsLoaded = ko.observable(false)

  self.itemSelected = (item) => {
    self.itemsToDisplay()
      .filter((i) => i.id !== item.id)
      .forEach((i) => i.isActive(false))
  }

  self.selectedTypeFilterName.subscribe(function (newValue) {
    const typeFilter = self.typeFilters().find((tf) => tf.typeName() === newValue)
    typeFilter.select()
  })

  self.typeFilterSelected = (selectedFilter) => {
    self.typeFilters()
      .filter((tf) => tf.typeName() !== selectedFilter.typeName())
      .forEach((tf) => tf.deselect())
    self.selectedTypeFilterName(selectedFilter.typeName())
    browser.pushHistory({}, `${selectedFilter.typeName()} Accommodation - Street Support`, `?filterId=${selectedFilter.typeName()}`)
  }

  self.displayFilter = ko.observable(false)
  self.toggleFilterDisplay = () => {
    self.displayFilter(!self.displayFilter())
  }

  self.init = (currentLocation) => {
    browser.loading()
    ajaxGet.data(`${endpoints.accommodation}?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`)
      .then((result) => {
        result.data.items
          .forEach((e, i) => {
            e.mapIndex = i
          })

        self.items(result.data.items.map((i) => new Accommodation(i, [self])))

        const types = Array.from(new Set(result.data.items
          .map((i) => i.accommodationType)))
          .filter((i) => i !== null && i.length > 0)
          .map((i) => new TypeFilter(i, [self]))
        const all = new TypeFilter('all', [self], true)
        self.typeFilters([all, ...types])

        self.dataIsLoaded(true)
        browser.loaded()

        const filterInQs = querystring.parameter('filterId')
        if (filterInQs !== undefined && filterInQs.length) {
          self.selectedTypeFilterName(filterInQs)
        }
      })
  }

  locationSelector
    .getCurrent()
    .then((result) => {
      self.init(result)
    })
}

module.exports = AccommodationListing