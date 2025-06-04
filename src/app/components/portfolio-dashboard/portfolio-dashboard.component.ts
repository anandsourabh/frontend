import { Component, Input, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import * as am4maps from '@amcharts/amcharts4/maps';
import am4geodata_worldLow from '@amcharts/amcharts4-geodata/worldLow';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

// Apply theme
am4core.useTheme(am4themes_animated);

@Component({
  selector: 'app-portfolio-dashboard',
  template: `
    <div class="portfolio-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <h2>Portfolio Overview Dashboard</h2>
        <p class="last-updated">Data as of {{currentDate | date:'medium'}}</p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="metric-card">
          <div class="metric-icon">
            <mat-icon>location_city</mat-icon>
          </div>
          <div class="metric-content">
            <h3>{{formatNumber(dashboardData?.summary_metrics?.total_locations)}}</h3>
            <p>Total Locations</p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <mat-icon>business</mat-icon>
          </div>
          <div class="metric-content">
            <h3>{{formatNumber(dashboardData?.summary_metrics?.total_buildings)}}</h3>
            <p>Total Buildings</p>
          </div>
        </div>

        <div class="metric-card highlight">
          <div class="metric-icon">
            <mat-icon>account_balance</mat-icon>
          </div>
          <div class="metric-content">
            <h3>{{formatCurrency(dashboardData?.summary_metrics?.total_tiv)}}</h3>
            <p>Total Insured Value</p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <mat-icon>public</mat-icon>
          </div>
          <div class="metric-content">
            <h3>{{formatNumber(dashboardData?.summary_metrics?.unique_countries)}}</h3>
            <p>Countries</p>
          </div>
        </div>
      </div>

      <!-- Main Charts Grid -->
      <div class="charts-grid">
        <!-- Geographic Map -->
        <div class="chart-container map-container">
          <h3>Geographic Distribution</h3>
          <div id="geographic-map" class="chart-div"></div>
        </div>

        <!-- Risk Analysis -->
        <div class="chart-container">
          <h3>Natural Hazard Risk Analysis</h3>
          <mat-tab-group>
            <mat-tab label="Earthquake">
              <div id="earthquake-risk-chart" class="chart-div"></div>
            </mat-tab>
            <mat-tab label="Flood">
              <div id="flood-risk-chart" class="chart-div"></div>
            </mat-tab>
            <mat-tab label="Hurricane">
              <div id="hurricane-risk-chart" class="chart-div"></div>
            </mat-tab>
          </mat-tab-group>
        </div>

        <!-- Construction Type -->
        <div class="chart-container">
          <h3>Construction Type Distribution</h3>
          <div id="construction-chart" class="chart-div"></div>
        </div>

        <!-- Property Age -->
        <div class="chart-container">
          <h3>Property Age Distribution</h3>
          <div id="age-chart" class="chart-div"></div>
        </div>

        <!-- Business Units -->
        <div class="chart-container full-width">
          <h3>Business Unit Breakdown</h3>
          <div id="business-unit-chart" class="chart-div"></div>
        </div>
      </div>

      <!-- Data Quality Section -->
      <div class="data-quality-section">
        <h3>Data Quality Metrics</h3>
        <div class="quality-metrics">
          <div class="quality-item">
            <div class="quality-label">Geocoding</div>
            <div class="quality-bar">
              <div class="quality-fill" [style.width.%]="dashboardData?.data_quality_metrics?.geocoding_completeness"></div>
            </div>
            <div class="quality-value">{{dashboardData?.data_quality_metrics?.geocoding_completeness}}%</div>
          </div>

          <div class="quality-item">
            <div class="quality-label">Construction Data</div>
            <div class="quality-bar">
              <div class="quality-fill" [style.width.%]="dashboardData?.data_quality_metrics?.construction_completeness"></div>
            </div>
            <div class="quality-value">{{dashboardData?.data_quality_metrics?.construction_completeness}}%</div>
          </div>

          <div class="quality-item">
            <div class="quality-label">Occupancy Data</div>
            <div class="quality-bar">
              <div class="quality-fill" [style.width.%]="dashboardData?.data_quality_metrics?.occupancy_completeness"></div>
            </div>
            <div class="quality-value">{{dashboardData?.data_quality_metrics?.occupancy_completeness}}%</div>
          </div>

          <div class="quality-item">
            <div class="quality-label">TIV Data</div>
            <div class="quality-bar">
              <div class="quality-fill" [style.width.%]="dashboardData?.data_quality_metrics?.tiv_completeness"></div>
            </div>
            <div class="quality-value">{{dashboardData?.data_quality_metrics?.tiv_completeness}}%</div>
          </div>
        </div>
      </div>

      <!-- High Risk Summary -->
      <div class="risk-summary-section">
        <h3>High Risk Locations Summary</h3>
        <div class="risk-cards">
          <div class="risk-card" *ngFor="let hazard of getHazardTypes()">
            <mat-icon>{{getHazardIcon(hazard.type)}}</mat-icon>
            <div class="risk-content">
              <h4>{{hazard.label}}</h4>
              <p>{{hazard.count}} of {{dashboardData?.hazard_summary?.total_locations}} locations</p>
              <div class="risk-percentage">{{hazard.percentage}}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Locations Table -->
      <div class="top-locations-section">
        <h3>Top 10 Locations by TIV</h3>
        <div class="table-wrapper">
          <table mat-table [dataSource]="topLocationsDataSource" class="locations-table">
            <ng-container matColumnDef="location_name">
              <th mat-header-cell *matHeaderCellDef>Location</th>
              <td mat-cell *matCellDef="let location">{{location.location_name || 'N/A'}}</td>
            </ng-container>

            <ng-container matColumnDef="city">
              <th mat-header-cell *matHeaderCellDef>City</th>
              <td mat-cell *matCellDef="let location">{{location.city}}</td>
            </ng-container>

            <ng-container matColumnDef="state">
              <th mat-header-cell *matHeaderCellDef>State</th>
              <td mat-cell *matCellDef="let location">{{location.state}}</td>
            </ng-container>

            <ng-container matColumnDef="tiv">
              <th mat-header-cell *matHeaderCellDef>TIV</th>
              <td mat-cell *matCellDef="let location">{{location.tiv}}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portfolio-dashboard {
      width: 100%;
      background: #f5f7fa;
      border-radius: 12px;
      padding: 24px;
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .dashboard-header h2 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #293340;
    }

    .last-updated {
      color: #666;
      font-size: 14px;
      margin-top: 8px;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    }

    .metric-card.highlight {
      background: linear-gradient(135deg, #2640e8 0%, #1a2cb8 100%);
      color: white;
    }

    .metric-card.highlight .metric-icon {
      background: rgba(255,255,255,0.2);
    }

    .metric-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: #f0f4ff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .metric-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #2640e8;
    }

    .metric-card.highlight .metric-icon mat-icon {
      color: white;
    }

    .metric-content h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .metric-content p {
      margin: 4px 0 0 0;
      font-size: 14px;
      opacity: 0.8;
    }

    /* Charts Grid */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .chart-container {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .chart-container.map-container {
      grid-column: span 2;
    }

    .chart-container.full-width {
      grid-column: 1 / -1;
    }

    .chart-container h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #293340;
    }

    .chart-div {
      width: 100%;
      height: 300px;
    }

    .map-container .chart-div {
      height: 400px;
    }

    /* Data Quality Section */
    .data-quality-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .data-quality-section h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #293340;
    }

    .quality-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .quality-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quality-label {
      font-size: 14px;
      color: #666;
    }

    .quality-bar {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }

    .quality-fill {
      height: 100%;
      background: linear-gradient(90deg, #4caf50 0%, #2e7d32 100%);
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    .quality-value {
      font-size: 14px;
      font-weight: 600;
      color: #293340;
      text-align: right;
    }

    /* Risk Summary */
    .risk-summary-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .risk-summary-section h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #293340;
    }

    .risk-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .risk-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #fff5f5;
      border-radius: 8px;
      border: 1px solid #ffcdd2;
    }

    .risk-card mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #f44336;
    }

    .risk-content h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #293340;
    }

    .risk-content p {
      margin: 4px 0;
      font-size: 12px;
      color: #666;
    }

    .risk-percentage {
      font-size: 18px;
      font-weight: 600;
      color: #f44336;
    }

    /* Top Locations Table */
    .top-locations-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .top-locations-section h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #293340;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .locations-table {
      width: 100%;
      background: transparent;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }

      .chart-container.map-container {
        grid-column: span 1;
      }

      .summary-cards {
        grid-template-columns: 1fr 1fr;
      }
    }
  `]
})
export class PortfolioDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() dashboardData: any;
  @Input() currencySymbol = '$';

  currentDate = new Date();
  topLocationsDataSource: any[] = [];
  displayedColumns = ['location_name', 'city', 'state', 'tiv'];

  private charts: any[] = [];

  ngOnInit(): void {
    if (this.dashboardData?.top_locations) {
      this.topLocationsDataSource = this.dashboardData.top_locations.slice(0, 10);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.createAllCharts();
    }, 100);
  }

  ngOnDestroy(): void {
    // Dispose all charts
    this.charts.forEach(chart => {
      if (chart) {
        chart.dispose();
      }
    });
  }

  createAllCharts(): void {
    if (!this.dashboardData) return;

    // Create all visualizations
    this.createGeographicMap();
    this.createRiskCharts();
    this.createConstructionChart();
    this.createAgeChart();
    this.createBusinessUnitChart();
  }

  createGeographicMap(): void {
    const mapData = this.dashboardData?.geographic_distribution || [];
    if (mapData.length === 0) return;

    const chart = am4core.create("geographic-map", am4maps.MapChart);
    this.charts.push(chart);

    chart.geodata = am4geodata_worldLow;
    chart.projection = new am4maps.projections.Miller();

    // Background map
    const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
    polygonSeries.useGeodata = true;
    polygonSeries.mapPolygons.template.fill = am4core.color("#e0e0e0");
    polygonSeries.mapPolygons.template.stroke = am4core.color("#ffffff");

    // Points for locations
    const pointSeries = chart.series.push(new am4maps.MapImageSeries());
    
    const imageTemplate = pointSeries.mapImages.template;
    imageTemplate.propertyFields.latitude = "latitude";
    imageTemplate.propertyFields.longitude = "longitude";
    
    const circle = imageTemplate.createChild(am4core.Circle);
    circle.radius = 4;
    circle.propertyFields.fill = "color";
    circle.tooltipText = "{location_name}\n{city}, {state}\nTIV: {tiv}\nRisk: {overall_risk}";

    // Process map data
    const processedData = mapData.map((location: any) => ({
      ...location,
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
      color: this.getRiskColor(location.overall_risk)
    }));

    pointSeries.data = processedData;

    // Zoom controls
    chart.zoomControl = new am4maps.ZoomControl();
  }

  createRiskCharts(): void {
    // Create earthquake risk chart
    this.createRiskPieChart('earthquake-risk-chart', this.dashboardData?.risk_analysis?.earthquake || []);
    
    // Create flood risk chart
    this.createRiskPieChart('flood-risk-chart', this.dashboardData?.risk_analysis?.flood || []);
    
    // Create hurricane risk chart
    this.createRiskPieChart('hurricane-risk-chart', this.dashboardData?.risk_analysis?.hurricane || []);
  }

  createRiskPieChart(elementId: string, data: any[]): void {
    if (!data || data.length === 0) return;

    const chart = am4core.create(elementId, am4charts.PieChart);
    this.charts.push(chart);

    const pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = "location_count";
    pieSeries.dataFields.category = "risk_level";
    
    // Custom colors for risk levels
    pieSeries.slices.template.propertyFields.fill = "color";

    pieSeries.slices.template.tooltipText = "{category}: {location_count} locations\nTIV: {tiv_formatted}";
    
    // Process data with colors
    chart.data = data.map(item => ({
      ...item,
      color: this.getRiskLevelColor(item.risk_level),
      tiv_formatted: this.formatCurrency(item.total_tiv)
    }));

    pieSeries.labels.template.disabled = true;
    pieSeries.ticks.template.disabled = true;
    
    // Add legend
    chart.legend = new am4charts.Legend();
    chart.legend.position = "right";
    chart.legend.fontSize = 12;
  }

  createConstructionChart(): void {
    const data = this.dashboardData?.construction_breakdown || [];
    if (data.length === 0) return;

    const chart = am4core.create("construction-chart", am4charts.XYChart);
    this.charts.push(chart);

   chart.data = data.slice(0, 8).map((item: { total_tiv: any; }) => ({
      ...item,
      tiv_formatted: this.formatCurrency(item.total_tiv)
    }));

    

    const categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = "construction_type";
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.labels.template.rotation = -45;
    categoryAxis.renderer.labels.template.horizontalCenter = "right";
    categoryAxis.renderer.labels.template.verticalCenter = "middle";

    const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.title.text = "Total Insured Value";

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.columns.template.tooltipText = "{categoryX}\nLocations: {location_count}\nTIV: [bold]{tiv_formatted}[/]";
    series.dataFields.valueY = "total_tiv";
    series.dataFields.categoryX = "construction_type";
    series.columns.template.fill = am4core.color("#2640e8");
    series.columns.template.strokeWidth = 0;
    series.columns.template.tooltipText = "{categoryX}: {valueY}";
  }

  createAgeChart(): void {
    const data = this.dashboardData?.age_distribution || [];
    if (data.length === 0) return;

    const chart = am4core.create("age-chart", am4charts.XYChart);
    this.charts.push(chart);

    chart.data = data;

    const categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = "age_group";
    categoryAxis.renderer.grid.template.location = 0;

    const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.title.text = "Number of Locations";

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = "location_count";
    series.dataFields.categoryX = "age_group";
    series.columns.template.fill = am4core.color("#4caf50");
    series.columns.template.strokeWidth = 0;
    series.columns.template.tooltipText = "{categoryX}: {valueY} locations\nTIV: {total_tiv}";
  }

  createBusinessUnitChart(): void {
    const data = this.dashboardData?.business_unit_breakdown || [];
    if (data.length === 0) return;

    const chart = am4core.create("business-unit-chart", am4charts.XYChart);
    this.charts.push(chart);

    chart.data = data.slice(0, 10); // Top 10 business units

    const categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = "business_unit";
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.inversed = true;

    const valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
    valueAxis.title.text = "Total Insured Value";

    // Create series for different value types
    const createSeries = (field: string, name: string, color: string) => {
      const series = chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.valueX = field;
      series.dataFields.categoryY = "business_unit";
      series.name = name;
      series.columns.template.fill = am4core.color(color);
      series.columns.template.strokeWidth = 0;
      series.stacked = true;
      series.columns.template.tooltipText = "{name}: {valueX}";
      return series;
    };

    createSeries("building_value", "Building", "#2640e8");
    createSeries("content_value", "Contents", "#4caf50");
    createSeries("bi_value", "Business Interruption", "#ff9800");

    chart.legend = new am4charts.Legend();
    chart.legend.position = "bottom";
  }

  // Helper methods
  formatNumber(value: any): string {
    if (!value) return '0';
    return value.toLocaleString();
  }

  getRiskColor(risk: string): am4core.Color {
    switch (risk?.toLowerCase()) {
      case 'high':
        return am4core.color("#f44336");
      case 'medium':
        return am4core.color("#ff9800");
      case 'low':
        return am4core.color("#4caf50");
      default:
        return am4core.color("#9e9e9e");
    }
  }

  getRiskLevelColor(level: string): am4core.Color {
    switch (level?.toLowerCase()) {
      case 'high':
        return am4core.color("#f44336");
      case 'medium':
        return am4core.color("#ff9800");
      case 'low':
        return am4core.color("#4caf50");
      default:
        return am4core.color("#9e9e9e");
    }
  }

  getHazardTypes(): any[] {
    const hazardSummary = this.dashboardData?.hazard_summary || {};
    const total = hazardSummary.total_locations || 1;

    return [
      {
        type: 'earthquake',
        label: 'Earthquake',
        count: hazardSummary.high_earthquake_risk || 0,
        percentage: ((hazardSummary.high_earthquake_risk || 0) / total * 100).toFixed(1)
      },
      {
        type: 'flood',
        label: 'Flood',
        count: (hazardSummary.high_river_flood_risk || 0) + (hazardSummary.high_flash_flood_risk || 0),
        percentage: (((hazardSummary.high_river_flood_risk || 0) + (hazardSummary.high_flash_flood_risk || 0)) / total * 100).toFixed(1)
      },
      {
        type: 'hurricane',
        label: 'Hurricane',
        count: hazardSummary.high_hurricane_risk || 0,
        percentage: ((hazardSummary.high_hurricane_risk || 0) / total * 100).toFixed(1)
      },
      {
        type: 'wildfire',
        label: 'Wildfire',
        count: hazardSummary.high_wildfire_risk || 0,
        percentage: ((hazardSummary.high_wildfire_risk || 0) / total * 100).toFixed(1)
      }
    ];
  }

  getHazardIcon(type: string): string {
    const iconMap: {[key: string]: string} = {
      'earthquake': 'terrain',
      'flood': 'water_damage',
      'hurricane': 'storm',
      'wildfire': 'local_fire_department'
    };
    return iconMap[type] || 'warning';
  }

  formatCurrency(value: any): string {
  if (!value || typeof value !== 'string') return '0';
  
  // Extract numeric value from formatted currency string
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  
  if (isNaN(numericValue)) return value;
  
  // Format based on size
  if (numericValue >= 1e9) {
    return this.currencySymbol + (numericValue / 1e9).toFixed(1) + 'B';
  } else if (numericValue >= 1e6) {
    return this.currencySymbol + (numericValue / 1e6).toFixed(1) + 'M';
  } else if (numericValue >= 1e3) {
    return this.currencySymbol + (numericValue / 1e3).toFixed(1) + 'K';
  } else {
    return this.currencySymbol + numericValue.toFixed(0);
  }
}
}