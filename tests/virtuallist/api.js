(function() {
    var container,
        asyncDataSource,
        virtualSettings,
        VirtualList = kendo.ui.VirtualList,
        ITEM_HEIGHT = 40,
        CONTAINER_HEIGHT = 200,

        SELECTED = "k-state-selected";

    function scroll(element, height) {
        element.scrollTop(height);
        element.trigger("scroll");
    }

    function generateData(parameters) {
        var items = [];
        for (var i = parameters.skip, len = parameters.skip + parameters.take; i < len; i++) {
            items.push({
                id: i,
                value: i,
                text: "Item " + i
            });
        }

        return items;
    }

    module("VirtualList API: ", {
        setup: function() {
            container = $("<div id='container'></div>").appendTo(QUnit.fixture);

            asyncDataSource = new kendo.data.DataSource({
                transport: {
                    read: function(options) {
                        setTimeout(function() {
                            options.success({ data: generateData(options.data), total: 300 });
                        }, 0);
                    }
                },
                serverPaging: true,
                pageSize: 40,
                schema: {
                    data: "data",
                    total: "total"
                }
            });

            virtualSettings = {
                autoBind: false,
                dataSource: asyncDataSource,
                itemHeight: ITEM_HEIGHT,
                height: CONTAINER_HEIGHT,
                template: "#=text#",
                dataValueField: "value"
            };
        },

        teardown: function() {
            if (container.data("kendoVirtualList")) {
                container.data("kendoVirtualList").destroy();
            }

            QUnit.fixture.empty();
        }
    });

    //rendering

    asyncTest("scrollTo methods scrolls to a given height", 3, function() {
        var virtualList = new VirtualList(container, virtualSettings);

        asyncDataSource.read().then(function() {
            virtualList.scrollTo(76 * 40); //scroll to the 76th item (76 * ITEMHEIGHT)
            equal(virtualList.content[0].scrollTop, 76 * 40);

            setTimeout(function() {
                start();
                var item76 = virtualList.items().filter(":contains('Item 76')");

                ok(item76.length, "Item 76 is rendered");
                ok(item76.css("transform").indexOf(76*40) > -1, "Item 76 is positioned at the correct place with translateY");
            }, 300);
        });
    });

    asyncTest("scrollToIndex methods scrolls to a given record by index", 3, function() {
        var virtualList = new VirtualList(container, virtualSettings);

        asyncDataSource.read().then(function() {
            virtualList.scrollToIndex(76); //scroll to the 76th item
            equal(virtualList.content[0].scrollTop, 76 * 40); //ITEMHEIGHT = 40

            setTimeout(function() {
                start();
                var item76 = virtualList.items().filter(":contains('Item 76')");

                ok(item76.length, "Item 76 is rendered");
                ok(item76.css("transform").indexOf(76*40) > -1, "Item 76 is positioned at the correct place with translateY");
            }, 300);
        });
    });

    //events

    asyncTest("fires the itemChange event", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            itemChange: function() {
                start();
                ok(true, "itemChange event is fired");
                this.unbind("itemChange");
            }
        }));
        asyncDataSource.read();
    });

    asyncTest("fires the listBound event", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            listBound: function() {
                start();
                ok(true, "listBound event is fired");
                this.unbind("listBound");
            }
        }));
        asyncDataSource.read();
    });

    asyncTest("fires the activate event", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            activate: function() {
                start();
                ok(true, "activate event is fired");
                this.unbind("activate");
            },
            selectable: true
        }));

        asyncDataSource.read().then(function() {
            var item = virtualList.items().first();
            virtualList.select(item);
        });
    });

    asyncTest("fires the deactivate event", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            deactivate: function() {
                start();
                ok(true, "deactivate event is fired");
                this.unbind("deactivate");
            },
            selectable: true
        }));

        asyncDataSource.read().then(function() {
            var item = virtualList.items().first();

            virtualList.select(item);
            virtualList.select(item.next());
        });
    });

    asyncTest("fires the change event on select", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            change: function() {
                start();
                ok(true, "change event is fired");
            },
            selectable: true
        }));

        asyncDataSource.read().then(function() {
            virtualList.select(0);
        });
    });

    asyncTest("fires the change event when list is filtered", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true
        }));

        asyncDataSource.read().then(function() {
            virtualList.select(0);

            virtualList.bind("change", function() {
                start();
                ok(true);
            });

            virtualList.filter(true);
            virtualList.select(0);
        });
    });

    asyncTest("select method deselects selected item when filtered (multiple)", 5, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            valueMapper: function(options) {
                options.success([1, 2]);
            }
        }));

        virtualList.one("change", function() {
            virtualList.filter(true);
            virtualList.dataSource.filter({
                field: "value",
                operator: "eq",
                value: 2
            });

            virtualList.dataSource.one("change", function() {
                virtualList.bind("change", function(e) {
                    start()

                    var added = e.added;
                    var removed = e.removed;

                    equal(added.length, 0);
                    equal(removed.length, 1);

                    equal(removed[0].position, 1);
                    equal(removed[0].dataItem.text, "Item 2");
                    equal(virtualList.element.find(".k-state-selected").length, 0);
                });

                virtualList.select(0);
            });
        });

        virtualList.value([1, 2]);
        asyncDataSource.read()
    });

    asyncTest("fires the change event on deselect", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            value: 0
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function() {
                start();
                ok(true, "change event is fired");
            })
            virtualList.select(-1);
        });
    });

    asyncTest("in the change event widget passes deselected index", 2, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            value: 0
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function(e) {
                start();
                var removed = e.removed;

                equal(removed.length, 1);
                equal(removed[0].index, 0);
            });
            virtualList.select(-1);
        });
    });

    asyncTest("in the change event widget passes deselected indices when multiple selection is enabled", 3, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: [2, 7]
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function(e) {
                start();
                var removed = e.removed;

                equal(removed.length, 2);
                equal(removed[0].index, 2);
                equal(removed[1].index, 7);
            });
            virtualList.select([2, 7]);
        });
    });

    asyncTest("in the change event widget passes the selected indicies", 3, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple"
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function(e) {
                start();
                var added = e.added;

                equal(added.length, 2);
                equal(added[0].index, 2);
                equal(added[1].index, 7);
            });
            virtualList.select([2, 7]);
        });
    });

    asyncTest("widget passes deselected order index", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            value: 0
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function(e) {
                start();
                var removed = e.removed;
                equal(removed[0].position, 0);
            });
            virtualList.select(-1);
        });
    });

    asyncTest("widget passes deselected order indices when multiple selection is enabled", 3, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: [1, 2, 8, 10]
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function(e) {
                start();
                var removed = e.removed;

                equal(removed.length, 2);
                equal(removed[0].position, 0);
                equal(removed[1].position, 2);
            });
            virtualList.select([1, 8]);
        });
    });

    asyncTest("fires the click event", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            click: function() {
                start();
                ok(true, "click event is fired");
            },
            selectable: true
        }));

        asyncDataSource.read().then(function() {
            var item = virtualList.items().first();
            item.trigger("click");
        });
    });

    asyncTest("passes the item in click event handler", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            click: function(e) {
                start();
                equal(e.item.text(), this.items().first().text());
            },
            selectable: true
        }));

        asyncDataSource.read().then(function() {
            var item = virtualList.items().first();
            item.trigger("click");
        });
    });

    //methods

    asyncTest("selectedDataItems method returns correct amount of items after scrolling down and up", 2, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple"
        }));

        asyncDataSource.read().then(function() {
            virtualList.select(virtualList.items().first());
            equal(virtualList.selectedDataItems().length, 1);
            scroll(container, 4 * CONTAINER_HEIGHT);

            setTimeout(function() {
                virtualList.select(virtualList.items().last());
                scroll(container, 0);

                start();
                equal(virtualList.selectedDataItems().length, 2);
            }, 300);
        });
    });

    asyncTest("focus method returns null if there is no focused item", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true
        }));

        asyncDataSource.read().then(function() {
            start();
            equal(virtualList.focus(), null);
        });
    });

    //setOptions

    asyncTest("setOptions changes the template", 2, function() {
        var virtualList = new VirtualList(container, virtualSettings);

        asyncDataSource.read().then(function() {
            start();
            equal(virtualList.items().first().text(), "Item 0");

            virtualList.setOptions({
                template: "<span class='foo'>#:text#</span>"
            });

            equal(virtualList.items().first().html(), '<span class="foo">Item 0</span>');
        });
    });

    asyncTest("setOptions turns on the selectable", 1, function() {
        var virtualList = new VirtualList(container, virtualSettings);
        virtualList.bind("click", function() {
            ok(true);
        });

        asyncDataSource.read().then(function() {
            start();
            virtualList.setOptions({ selectable: true });
            virtualList.items().first().trigger("click");
        });
    });

    asyncTest("setOptions turns off the selectable", 0, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            click: function() {
                ok(false);
            }
        }));

        asyncDataSource.read().then(function() {
            start();
            virtualList.setOptions({ selectable: false });
            virtualList.items().first().trigger("click");
        });
    });

    test("isBound returns false if the list is not bound yet", 1, function() {
        var virtualList = new VirtualList(container, virtualSettings);
        asyncDataSource.read();
        ok(!virtualList.isBound());
    });

    asyncTest("isBound returns true if the list is bound", 1, function() {
        var virtualList = new VirtualList(container, virtualSettings);
        asyncDataSource.read().then(function() {
            start();
            ok(virtualList.isBound());
        });
    });

    asyncTest("filter method sets the filter state", 1, function() {
        var virtualList = new VirtualList(container, virtualSettings);
        asyncDataSource.read().then(function() {
            start();
            virtualList.filter(true);
            ok(virtualList.filter());
        });
    });

    asyncTest("value method prefetches values (single selection)", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            valueMapper: function(operation) {
                setTimeout(function() {
                    operation.success(123);
                }, 0);
            },
            change: function() {
                start();
                equal(virtualList.selectedDataItems()[0].value, 123);
            }
        }));

        virtualList.value(123)
        asyncDataSource.read();
    });

    asyncTest("value method prefetches values (multiple selection)", 2, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            valueMapper: function(operation) {
                setTimeout(function() {
                    operation.success([74, 123]);
                }, 0);
            },
            change: function() {
                start();
                equal(virtualList.selectedDataItems()[0].value, 74);
                equal(virtualList.selectedDataItems()[1].value, 123);
            }
        }));

        virtualList.value([74, 123]);
        asyncDataSource.read();
    });

    asyncTest("when empty array is passed to the value method all values are cleared", 3, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: [1, 2, 3]
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function() {
                start();
                ok(true, "change is fired");
                equal(this.value().length, 0);
                equal(this.selectedDataItems().length, 0);
            });
            virtualList.value([]);
        });
    });

    asyncTest("when empty array is passed to the value method removed items are available in the change event", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: [1, 2, 3]
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function(e) {
                start();
                equal(e.removed.length, 3);
            });
            virtualList.value([]);
        });
    });

    asyncTest("value method clears previous values and dataItems (single selection)", 3, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            value: [1]
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function() {
                start(); //select new values
                equal(this.selectedDataItems().length, 1);
                equal(this.value().length, 1);
                equal(this.value()[0], 4);
            });
            virtualList.value([4]);
        });
    });

    asyncTest("value method clears previous values and dataItems (multiple)", 4, function() {
        var count = 1;
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: [1, 2, 3]
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function() {
                if (count === 1) { //first change de-selects all items
                    equal(this.value().length, 0);
                    equal(this.selectedDataItems().length, 0);
                    count += 1;
                } else {
                    start(); //select new values
                    equal(this.value().length, 2);
                    equal(this.selectedDataItems().length, 2);
                }
            });
            virtualList.value([4, 5]);
        });
    });

    asyncTest("value method clears previous values and dataItems", 3, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            value: [1]
        }));

        asyncDataSource.read().then(function() {
            virtualList.bind("change", function() {
                start();
                equal(this.value().length, 1);
                equal(this.value()[0], 2);

                equal(this.element.find(".k-state-selected").length, 1);
            });
            virtualList.value([2]);
        });
    });

    asyncTest("value method return resolved promise", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            valueMapper: function(operation) {
                setTimeout(function() {
                    operation.success(20);
                }, 0);
            }
        }));

        asyncDataSource.read().done(function() {
            virtualList.value(20).done(function() {
                start();
                ok(true);
            });
        });
    });

    asyncTest("value method returns promise resolved after data prefetch", 2, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: true,
            valueMapper: function(operation) {
                setTimeout(function() {
                    operation.success(123);
                }, 0);
            }
        }));

        virtualList.value(123).done(function() {
            var indices = virtualList.select();

            equal(indices.length, 1);
            equal(indices[0], 123);

            start();
        });

        asyncDataSource.read();
    });

    asyncTest("widget does not trigger change when new item is added to the source", 0, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: "1",
            valueMapper: function(operation) {
                operation.success(1);
            }
        }));

        asyncDataSource.read()
        virtualList.one("listBound", function() {
            virtualList.bind("change", function() {
                ok(false);
            });

            virtualList.dataSource.add("new item");

            start();
        });
    });

    asyncTest("widget does not trigger change when an item is removed from the source", 0, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: "1",
            valueMapper: function(operation) {
                operation.success(1);
            }
        }));

        asyncDataSource.read();

        virtualList.one("listBound", function() {
            virtualList.bind("change", function() {
                ok(false);
            });

            virtualList.dataSource.remove(virtualList.dataSource.at(0));

            start();
        });
    });

    asyncTest("setDataSource method clears value before setting the new source", 1, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: "1",
            valueMapper: function(operation) {
                operation.success(1);
            }
        }));

        virtualList.one("listBound", function() {
            virtualList.bind("change", function() {
                equal(virtualList.value().length, 0);
                start();
            });

            virtualList.setDataSource(["1", "2"]);
        });

        asyncDataSource.read();
    });

    asyncTest("setDataSource method sets value silently after source is changed", 3, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            value: "1",
            valueMapper: function(operation) {
                operation.success(1);
            }
        }));

        virtualList.one("listBound", function() {
            virtualList.bind("change", function() {
                ok(true);
            });

            virtualList.setDataSource(["1", "2"]);

            equal(virtualList.value().length, 1);
            equal(virtualList.value()[0], "1");
            start();
        });

        asyncDataSource.read();
    });

    asyncTest("removeAt method removes values at current position", 6, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            valueMapper: function(operation) {
                operation.success([123, 223]);
            },
            change: function() {
                start();

                virtualList.removeAt(0);

                var value = virtualList.value();
                var indices = virtualList.select();
                var dataItems = virtualList.selectedDataItems();

                equal(value.length, 1);
                equal(indices.length, 1);
                equal(dataItems.length, 1);

                equal(value[0], 223);
                equal(indices[0], 223);
                equal(dataItems[0].value, 223);
            }
        }));

        virtualList.value([123, 223]);

        asyncDataSource.read()
    });

    asyncTest("removeAt method returns deleted data item", 3, function() {
        var virtualList = new VirtualList(container, $.extend(virtualSettings, {
            selectable: "multiple",
            valueMapper: function(operation) {
                operation.success([123, 223]);
            },
            change: function() {
                start();

                var removed = virtualList.removeAt(0);

                equal(removed.position, 0);
                equal(removed.dataItem.value, 123);
                ok(!$.isArray(removed.dataItem));
            }
        }));

        virtualList.value([123, 223]);

        asyncDataSource.read()
    });
})();
