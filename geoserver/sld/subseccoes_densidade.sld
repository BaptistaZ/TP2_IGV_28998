<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>subseccoes</Name>
    <UserStyle>
      <Title>População por subsecção (BGRI 2021)</Title>
      <Abstract>Coroplético graduado pelo número de indivíduos de cada subsecção estatística.</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <Title>&lt; 50</Title>
          <ogc:Filter>
            <ogc:PropertyIsLessThan>
              <ogc:PropertyName>n_individuos</ogc:PropertyName>
              <ogc:Literal>50</ogc:Literal>
            </ogc:PropertyIsLessThan>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#fee5d9</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#cccccc</CssParameter><CssParameter name="stroke-width">0.3</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Title>50 – 150</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo>
                <ogc:PropertyName>n_individuos</ogc:PropertyName><ogc:Literal>50</ogc:Literal>
              </ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan>
                <ogc:PropertyName>n_individuos</ogc:PropertyName><ogc:Literal>150</ogc:Literal>
              </ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#fcae91</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#cccccc</CssParameter><CssParameter name="stroke-width">0.3</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Title>150 – 300</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo>
                <ogc:PropertyName>n_individuos</ogc:PropertyName><ogc:Literal>150</ogc:Literal>
              </ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan>
                <ogc:PropertyName>n_individuos</ogc:PropertyName><ogc:Literal>300</ogc:Literal>
              </ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#fb6a4a</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#cccccc</CssParameter><CssParameter name="stroke-width">0.3</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Title>300 – 600</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo>
                <ogc:PropertyName>n_individuos</ogc:PropertyName><ogc:Literal>300</ogc:Literal>
              </ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan>
                <ogc:PropertyName>n_individuos</ogc:PropertyName><ogc:Literal>600</ogc:Literal>
              </ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#de2d26</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#cccccc</CssParameter><CssParameter name="stroke-width">0.3</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Title>&gt;= 600</Title>
          <ogc:Filter>
            <ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyName>n_individuos</ogc:PropertyName><ogc:Literal>600</ogc:Literal>
            </ogc:PropertyIsGreaterThanOrEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#a50f15</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#cccccc</CssParameter><CssParameter name="stroke-width">0.3</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
