import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import * as am4maps from '@amcharts/amcharts4/maps';
import am4geodata_worldLow from '@amcharts/amcharts4-geodata/worldLow';

@Component({
  selector: 'app-chart',
template: `
  <div class="chart-container">
    <div class="chart-controls">
      <mat-form-field appearance="outline">
        <mat-label>Chart</mat-label>
        <mat-select [formControl]="chartTypeControl" (selectionChange)="onChartTypeChange()">
          <mat-option value="bar">Bar</mat-option>
          <mat-option value="line">Line</mat-option>
          <mat-option value="pie">Pie</mat-option>
          <mat-option value="scatter">Scatter</mat-option>
          <mat-option value="area">Area</mat-option>
        </mat-select>
      </mat-form-field>
      
      <mat-form-field appearance="outline" *ngIf="showAxisControls">
        <mat-label>X-Axis</mat-label>
        <mat-select [formControl]="xAxisControl" (selectionChange)="updateChart()">
          <mat-option *ngFor="let col of columns.slice(0, 10)" [value]="col">{{col}}</mat-option>
        </mat-select>
      </mat-form-field>
      
      <mat-form-field appearance="outline" *ngIf="showAxisControls">
        <mat-label>Y-Axis</mat-label>
        <mat-select [formControl]="yAxisControl" (selectionChange)="updateChart()">
          <mat-option *ngFor="let col of numericColumns.slice(0, 8)" [value]="col">{{col}}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    
    <div #chartDiv class="chart-div"></div>
  </div>
`,
styles: [`
  .chart-container {
    width: 100%;
    background: white;
    border-radius: 8px;
    padding: 16px;
  }
  
  .chart-controls {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  
  .chart-controls mat-form-field {
    min-width: 120px;
    flex: 1;
    max-width: 180px;
  }
  
  .chart-div {
    width: 100%;
    height: 350px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fafafa;
  }
  
  @media (max-width: 768px) {
    .chart-controls {
      flex-direction: column;
    }
    
    .chart-controls mat-form-field {
      max-width: none;
    }
    
    .chart-div {
      height: 280px;
    }
  }
`]
})
export class ChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() data: any[] = [];
  @Input() visualizationConfig?: { [key: string]: string };
  @ViewChild('chartDiv', { static: true }) chartDiv!: ElementRef;

  chartTypeControl = new FormControl('bar');
  xAxisControl = new FormControl('');
  yAxisControl = new FormControl('');

  columns: string[] = [];
  numericColumns: string[] = [];
  hasGeoData = false;
  showAxisControls = true;

  private chart: any;

  ngOnInit(): void {
    if (this.data && this.data.length > 0) {
      this.columns = Object.keys(this.data[0]);
      this.numericColumns = this.getNumericColumns();
      this.hasGeoData = this.checkGeoData();
      
      // Use backend visualization config if available
      if (this.visualizationConfig) {
        this.parseVisualizationConfig();
      } else {
        // Set default values
        this.xAxisControl.setValue(this.columns[0]);
        this.yAxisControl.setValue(this.numericColumns[0]);
      }
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.createChart(), 100);
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.dispose();
    }
  }

  private parseVisualizationConfig(): void {
    if (!this.visualizationConfig) return;
    
    // Parse the backend response format
    const chartType = this.visualizationConfig['Chart Type']?.toLowerCase() || 'bar';
    const xAxis = this.visualizationConfig['X-axis'] || this.columns[0];
    const yAxis = this.visualizationConfig['Y-axis'] || this.numericColumns[0];
    
    this.chartTypeControl.setValue(chartType);
    this.xAxisControl.setValue(xAxis);
    this.yAxisControl.setValue(yAxis);
    
    this.showAxisControls = !['pie', 'donut', 'heatmap', 'map'].includes(chartType);
  }

  onChartTypeChange(): void {
    const chartType = this.chartTypeControl.value;
    this.showAxisControls = !['pie', 'donut', 'heatmap', 'map'].includes(chartType || '');
    this.createChart();
  }

  updateChart(): void {
    this.createChart();
  }

  private createChart(): void {
    if (this.chart) {
      this.chart.dispose();
    }

    const chartType = this.chartTypeControl.value;
    
    switch (chartType) {
      case 'bar':
        this.createBarChart();
        break;
      case 'line':
        this.createLineChart();
        break;
      case 'pie':
        this.createPieChart();
        break;
      case 'donut':
        this.createDonutChart();
        break;
      case 'scatter':
      case 'scatterplot':
        this.createScatterChart();
        break;
      case 'stackedbar':
      case 'stacked-bar':
        this.createStackedBarChart();
        break;
      case 'areachart':
      case 'area':
        this.createAreaChart();
        break;
      case 'histogram':
        this.createHistogram();
        break;
      case 'heatmap':
        this.createHeatmap();
        break;
      case 'map':
        this.createMapChart();
        break;
      default:
        this.createBarChart();
    }
  }

  private createBarChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = this.xAxisControl.value;
    categoryAxis.renderer.minGridDistance = 30;
    categoryAxis.renderer.labels.template.rotation = -45;

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

    const series = this.chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = this.yAxisControl.value;
    series.dataFields.categoryX = this.xAxisControl.value;
    series.columns.template.fill = am4core.color('#2640e8');
    series.columns.template.stroke = am4core.color('#2640e8');
    
    // Add value labels on columns
    series.columns.template.tooltipText = "{categoryX}: [bold]{valueY}[/]";
  }

  private createLineChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = this.xAxisControl.value;

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

    const series = this.chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueY = this.yAxisControl.value;
    series.dataFields.categoryX = this.xAxisControl.value;
    series.stroke = am4core.color('#2640e8');
    series.strokeWidth = 3;
    
    // Add bullets
    const bullet = series.bullets.push(new am4charts.CircleBullet());
    bullet.circle.fill = am4core.color('#2640e8');
    bullet.circle.strokeWidth = 2;
    bullet.circle.stroke = am4core.color('#ffffff');
  }

  private createAreaChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = this.xAxisControl.value;

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

    const series = this.chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueY = this.yAxisControl.value;
    series.dataFields.categoryX = this.xAxisControl.value;
    series.stroke = am4core.color('#2640e8');
    series.fill = am4core.color('#2640e8');
    series.fillOpacity = 0.3;
    series.strokeWidth = 2;
  }

  private createPieChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.PieChart);
    this.chart.data = this.data;

    const pieSeries = this.chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = this.numericColumns[0];
    pieSeries.dataFields.category = this.columns[0];
    
    // Add labels
    pieSeries.labels.template.text = "{category}: {value}";
    pieSeries.slices.template.tooltipText = "{category}: [bold]{value}[/] ({value.percent.formatNumber('#.0')}%)";
  }

  private createDonutChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.PieChart);
    this.chart.data = this.data;
    this.chart.innerRadius = am4core.percent(40);

    const pieSeries = this.chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = this.numericColumns[0];
    pieSeries.dataFields.category = this.columns[0];
    
    pieSeries.labels.template.text = "{category}";
    pieSeries.slices.template.tooltipText = "{category}: [bold]{value}[/] ({value.percent.formatNumber('#.0')}%)";
  }

  private createScatterChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const valueAxisX = this.chart.xAxes.push(new am4charts.ValueAxis());
    valueAxisX.title.text = this.xAxisControl.value;
    
    const valueAxisY = this.chart.yAxes.push(new am4charts.ValueAxis());
    valueAxisY.title.text = this.yAxisControl.value;

    const series = this.chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueX = this.xAxisControl.value;
    series.dataFields.valueY = this.yAxisControl.value;
    series.strokeOpacity = 0;
    
    const bullet = series.bullets.push(new am4charts.CircleBullet());
    bullet.circle.fill = am4core.color('#2640e8');
    bullet.circle.strokeWidth = 0;
  }

  private createStackedBarChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = this.xAxisControl.value;

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

    // Create series for each numeric column
    this.numericColumns.slice(0, 5).forEach((column, index) => {
      const series = this.chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.valueY = column;
      series.dataFields.categoryX = this.xAxisControl.value;
      series.stacked = true;
      series.name = column;
      
      // Use different colors for each series
      const colors = ['#2640e8', '#293340', '#4caf50', '#ff9800', '#f44336'];
      series.fill = am4core.color(colors[index % colors.length]);
    });
    
    // Add legend
    this.chart.legend = new am4charts.Legend();
  }

  private createHistogram(): void {
    // For histogram, we'll group the data into bins
    this.createBarChart(); // Simplified approach
  }

  private createHeatmap(): void {
    // Simplified heatmap - would need more complex data transformation
    this.createBarChart(); // Fallback to bar chart
  }
// src/app/components/chart/chart.component.ts - Updated methods only

private checkGeoData(): boolean {
  return this.columns.some(col => 
    col.toLowerCase() === 'latitude' || 
    col.toLowerCase() === 'longitude'
  );
}

private createMapChart(): void {
  if (!this.hasGeoData) {
    this.createBarChart();
    return;
  }
  
  this.chart = am4core.create(this.chartDiv.nativeElement, am4maps.MapChart);
  this.chart.geodata = am4geodata_worldLow;
  this.chart.projection = new am4maps.projections.Miller();

  // Create polygon series for world map background
  const polygonSeries = this.chart.series.push(new am4maps.MapPolygonSeries());
  polygonSeries.useGeodata = true;
  polygonSeries.mapPolygons.template.fill = am4core.color("#e0e0e0");
  polygonSeries.mapPolygons.template.stroke = am4core.color("#ffffff");
  polygonSeries.mapPolygons.template.strokeWidth = 0.5;
  
  // Create point series for data locations
  const pointSeries = this.chart.series.push(new am4maps.MapImageSeries());
  
  // Configure point template
  const pointTemplate = pointSeries.mapImages.template;
  pointTemplate.propertyFields.latitude = "latitude";
  pointTemplate.propertyFields.longitude = "longitude";
  pointTemplate.nonScaling = true;
  
  // Create circle for each point
  const circle = pointTemplate.createChild(am4core.Circle);
  circle.radius = 10;
  circle.fill = am4core.color('#2640e8');
  circle.stroke = am4core.color('#ffffff');
  circle.strokeWidth = 2;
  circle.nonScaling = true;
  
  // Add tooltip
  circle.tooltipText = "{title}: Lat {latitude}, Lng {longitude}";
  
  // Prepare data for mapping
  const mapData = this.data
    .filter(item => {
      const lat = parseFloat(item['latitude']);
      const lng = parseFloat(item['longitude']);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    })
    .map(item => ({
      latitude: parseFloat(item['latitude']),
      longitude: parseFloat(item['longitude']),
      title: item[this.columns.find(col => !['latitude', 'longitude'].includes(col.toLowerCase())) || this.columns[0]] || 'Location'
    }));
  
  console.log('Map data:', mapData); // Debug log
  
  // Set data to point series
  pointSeries.data = mapData;
  
  // Add zoom controls
  this.chart.zoomControl = new am4maps.ZoomControl();
  this.chart.zoomControl.slider.height = 100;
  
  // Set initial zoom to show all points
  if (mapData.length > 0) {
    this.chart.events.on("ready", () => {
      pointSeries.events.on("datavalidated", () => {
        this.chart.zoomToMapObject(pointSeries);
      });
    });
  }
}

  private getNumericColumns(): string[] {
    if (!this.data || this.data.length === 0) return [];
    
    return this.columns.filter(col => {
      const value = this.data[0][col];
      return typeof value === 'number' || (!isNaN(Number(value)) && value !== null && value !== '');
    });
  }

}