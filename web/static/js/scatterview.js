class ScatterView extends View {
    constructor(data, svg) {
        super(data, svg, {});
        var me = this;
        me.color = me.vis.anomalyColor;
        me.margin = {
            top: 0,
            right: 0,
            bottom: 20,
            left: 40
        };
        me.x = d3.scaleLinear().range([me.margin.left, me.size.width - me.margin.right]);
        me.y = d3.scaleLinear().range([me.margin.top, me.size.height - me.margin.bottom]);

        me.selections = new Set();
        me.dot = {};
        this._drawBackground();
        me.xAxis = me.svg.append("g")
            .attr("class", "scatter x axis")    
            .attr("transform", "translate(0,"+(me.size.height - me.margin.bottom)+")")
        me.yAxis = me.svg.append("g")
            .attr("class", "scatter y axis")
            .attr("transform", "translate("+me.margin.left+",0)")
    }

    stream_update(){
        var me = this;
        me.selections.clear();
        me._updateAxis();
        me.svg.selectAll("circle").remove();
        me.draw();        
        me.transform = d3.zoomIdentity;
        //move some constructor here
        
    }

    draw(){
        this._drawDots();
        //this._drawPointLabel();
        this._drawAxis();
    }

    relabeled(){
        this._resetDotLabel();
    }
    trained(){
        this._resetDotLabel();
    }
    projectionChanged(){
        var me = this;
        me.transform = d3.zoomIdentity;    
        this.path.attr("d", "");
        me._updateAxis();

        this.dot
            .attr("cx", d => me.x(d.pos.x))
            .attr("cy", d => me.y(d.pos.y));
        this.textlabel
            .attr("x", d => me.x(d.pos.x))
            .attr("y", d => me.y(d.pos.y));
        if(this.data.projectionMethod==1){
            me.svg.selectAll('.dotName').remove();
        }else{
            this._drawPointLabel();
        }
    }

    rightClick(){
        d3.event.preventDefault();
        this.data.clearHight();
    }

    selected(){
    	this.dot
	    	.classed('selected',(d, i) => this.data.isSelected(i));
    }
    unselected(){
        this.path.attr("d", "");
    	this.dot.classed("selected", false);
    }

    _dragStart() {
        var selected = new Set();
        var me = this;
  		var t = me.transform;
        var coords = d3.event.subject,
            x0 = t.invertX(d3.event.x),
            y0 = t.invertY(d3.event.y);
        coords[0] = [t.invertX(coords[0][0]),t.invertY(coords[0][1])];

        me.path.datum(coords);
        var line = d3.line().curve(d3.curveBasis);
        d3.event.on("drag", function() {
            var x1 = t.invertX(d3.event.x),
                y1 = t.invertY(d3.event.y),
                dx = t.applyX(x1) - t.applyX(x0),
                dy = t.applyY(y1) - t.applyY(y0);

            if (dx * dx + dy * dy > 100) coords.push([x0 = x1, y0 = y1]);
            else coords[coords.length - 1] = [x1, y1];
            me.path.attr("d", line);
            me.dot.each(function(d, i) {
                var point = [t.invertX(d3.select(this).attr("cx")), t.invertY(d3.select(this).attr("cy"))];
                if(d3.polygonContains(coords, point)){
                	d3.select(this).classed('selected',true);
	                me.selections.add(i);
                }
            })
        });
    }

    _drawPointLabel() {
        var me = this;

        me.svg.selectAll('.dotName').remove();

        var dotName = me.svg.selectAll('.dotName')
        	.data(me.data.data);

        me.textlabel = dotName.enter().append("text").attr('class','dotName')
        	.filter(d => (d.relabel!=0 || d.anomaly_score<=me.data.scoreThreshold))
            .attr("x", d => me.x(d.pos.x))
            .attr("y", d => me.y(d.pos.y)+5)
            .text(d => "#"+Math.floor(d.id/visOptions.invokeNum)+"-"+d.id%visOptions.invokeNum);

        dotName.exit().remove();
    }

    _drawAxis(){
        var me = this;
        this.xAxis
            .call(d3.axisBottom(me.x).tickFormat(d=>d/1000000+"s"))
            .append("text")
            .attr("class", "label")
            .attr("x", me.size.width)
            .attr("y", -12)
            .text("Entry Time")
            .attr("text-anchor", "end")
            .attr("fill", "black");
        this.yAxis
            .call(d3.axisLeft(me.y).tickFormat(d=>d/1000+"ms"))
            .append("text")
            .attr("class", "label")
            .attr("x", 0)
            .attr("y", 12)
            .text("Execution Time")
            .attr("text-anchor", "start")
            .attr("fill", "black");
    }

    _drawDots() {
        var me = this;
        // Add the scatterplot
        me.dot = me.svg.selectAll("dot")
            .data(me.data.data)
            .enter().append("circle")
            .attr("r", 3)
            .attr("cx", d => me.x(d.pos.x))
            .attr("cy", d => me.y(d.pos.y))
            .attr("fill", d => me._fillColor(d))
            .attr("fill-opacity", d => me._fillOpacity(d));

        me.dot.on("click", function(d, i) {
            	me.data.clearHight();
                me.data.setSelections([i]);
            })
            .append("title")
            .text(function(d, i) {
                return i;
            });
    }
    _fillColor(d){
        var score = (d.relabel!=0)?d.relabel:this.vis.scoreScale(d.anomaly_score);
        return this.color(score);
    }
    _clusterColor(d){
        return this.vis.clusterColor(d.cluster_label);
    }

    _fillOpacity(d){
        return (d.relabel==0&&d.anomaly_score>this.data.scoreThreshold) ? 0.5 : 1;
    }

    changeColor(){
        this._resetDotLabel();
    }
    _resetDotLabel(){
        var me = this;

        if(me.vis.colorScheme == 0){
            this.dot
                .attr("fill", d => me._fillColor(d))
                .attr("fill-opacity", d => me._fillOpacity(d));
            this._drawPointLabel();//not t-sne
        }else{
            this.dot
                .attr("fill", d => me._clusterColor(d))
                .attr("fill-opacity", 0.5);
            me.svg.selectAll('.dotName').remove();
        }
    }
    _drawBackground(){
        var me = this;
        me.backgroud = me.svg.append('rect')
            .attr('x', me.x.range()[0])
            .attr('y', me.y.range()[0])
            .attr('width', me.x.range()[1] - me.x.range()[0])
            .attr('height', me.y.range()[1] - me.y.range()[0])
            .attr('stroke', '#000')
            .attr('stroke-width', 0)
            .style("fill", "white");
        me.backgroud.call(d3.drag()
            .container(function(d) {
                return this;
            })
            .subject(function(d) {
                var p = [d3.event.x, d3.event.y];
                return [p, p];
            })
            .on("start", function() {
                me.data.clearHight();
                me._dragStart();
            })
            .on("end", function(){
                me.data.setSelections(Array.from(me.selections));
                me.selections.clear();
            }));
        me.backgroud.call(d3.zoom()
            .scaleExtent([1, 80])
            .extent([[me.x.domain()[0],me.y.domain()[0]],[me.x.domain()[1],me.y.domain()[1]]])
            //.on("zoom", function(){
              //  me._zoom();
            //})
            );
        me.path = me.svg.append("path").attr("fill-opacity", 0.2);
    }

    _zoom(){
        var me = this;
        me.transform = d3.event.transform;

        var xrange = me.x.range();
        var yrange = me.y.range();
        var t = d3.event.transform;
        if (t.applyX(xrange[0]) > xrange[0]){
            t.x =xrange[0] -xrange[0] * t.k;
        }else if(t.applyX(xrange[1]) < xrange[1]){
            t.x = xrange[1] - xrange[1] * t.k;
        }
        if (t.applyY(yrange[0]) > yrange[0]){
            t.y = yrange[0]-yrange[0] * t.k;
        }else if(t.applyY(yrange[1]) < yrange[1]){
            t.y = yrange[1] - yrange[1] * t.k;

        }
        var new_xScale = d3.event.transform.rescaleX(me.x)
        var new_yScale = d3.event.transform.rescaleY(me.y)
        this.dot
            .attr("cx", d => new_xScale(d.pos.x))
            .attr("cy", d => new_yScale(d.pos.y))
            .attr('fill-opacity', d => (new_xScale(d.pos.x)>xrange[1]||new_xScale(d.pos.x)<xrange[0])?0:me._fillOpacity(d));
        this.textlabel
            .attr("x", d => new_xScale(d.pos.x))
            .attr("y", d => new_yScale(d.pos.y))
            .attr('opacity', d => (new_xScale(d.pos.x)>xrange[1]||new_xScale(d.pos.x)<xrange[0])?0:1);
        this.path.attr("transform", d3.event.transform);
    }

    _updateAxis(){
        var me = this;
        var xvalues = me.data.data.map(function(elt) {
            return elt.pos.x;
        });
        var yvalues = me.data.data.map(function(elt) {
            return elt.pos.y;
        });
        var ranges = {
            "xMax": Math.max.apply(null, xvalues),
            "xMin": Math.min.apply(null, xvalues),
            "yMax": Math.max.apply(null, yvalues),
            "yMin": Math.min.apply(null, yvalues),
        };
        ranges.xRange = ranges.xMax - ranges.xMin;
        ranges.yRange = ranges.yMax - ranges.yMin;

        // set the ranges
        me.x.domain([ranges.xMin - ranges.xRange / 15, ranges.xMax + ranges.xRange / 15]);
        me.y.domain([ranges.yMax + ranges.yRange / 50, ranges.yMin - ranges.yRange / 50]);

    }
}