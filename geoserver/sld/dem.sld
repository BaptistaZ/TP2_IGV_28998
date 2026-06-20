<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>dem</Name>
    <UserStyle>
      <Title>Modelo Digital do Terreno (altitude)</Title>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>0.85</Opacity>
            <ColorMap type="ramp">
              <ColorMapEntry color="#000000" quantity="-9999" opacity="0"/>
              <ColorMapEntry color="#f7fcf0" quantity="0"   label="0 m"/>
              <ColorMapEntry color="#bae4bc" quantity="100" label="100 m"/>
              <ColorMapEntry color="#7bccc4" quantity="250" label="250 m"/>
              <ColorMapEntry color="#43a2ca" quantity="450" label="450 m"/>
              <ColorMapEntry color="#0868ac" quantity="700" label="700 m"/>
              <ColorMapEntry color="#084081" quantity="850" label="850 m"/>
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
